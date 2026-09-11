import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { decrypt, encrypt } from "./crypto";
import { CalendarError, refresh, writeEvent } from "./providers";
import { disconnected } from "./queue";
export const calendarTransport = { refresh, writeEvent };
export async function syncNext(database: PrismaClient, transport = calendarTransport) {
  const now = new Date(), candidate = await database.calendarConnection.findFirst({ where: { status: "ACTIVE", nextSyncAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, orderBy: { nextSyncAt: "asc" } });
  if (!candidate) return false;
  const leaseToken = randomUUID(), leaseUntil = new Date(Date.now() + 90_000);
  const acquired = await database.calendarConnection.updateMany({ where: { id: candidate.id, status: "ACTIVE", credentialsVersion: candidate.credentialsVersion, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseToken, leaseUntil } });
  if (!acquired.count) return true;
  const fence = { id: candidate.id, leaseToken, credentialsVersion: candidate.credentialsVersion, status: "ACTIVE" as const };
  try {
    const owner = candidate.driverUserId ? await database.driverUser.findUnique({ where: { id: candidate.driverUserId } }) : null;
    const passenger = candidate.bookingId ? await database.booking.findUnique({ where: { id: candidate.bookingId } }) : null;
    const valid = owner ? owner.active && !owner.mustChangePassword && owner.accessVersion === candidate.ownerVersion : passenger && passenger.passengerVersion === candidate.ownerVersion && passenger.endsAt.getTime() > Date.now() - 90 * 86400_000;
    if (!valid || !candidate.refreshToken) { await database.calendarConnection.updateMany({ where: fence, data: disconnected }); return true; }
    const tokens = await transport.refresh(candidate.provider, decrypt(candidate.refreshToken, candidate.id));
    if (tokens.refreshToken) { if (!(await database.calendarConnection.updateMany({ where: fence, data: { refreshToken: encrypt(tokens.refreshToken, candidate.id) } })).count) return true; }
    const bookings = await database.booking.findMany({ where: { ...(owner ? { driverId: owner.driverId } : { id: passenger!.id }), OR: [{ status: "CONFIRMED", endsAt: { gte: now } }, { calendarEvents: { some: { connectionId: candidate.id } } }] }, include: { calendarEvents: { where: { connectionId: candidate.id } } }, orderBy: { startsAt: "asc" } });
    let writes = 0, remaining = false;
    for (const booking of bookings) {
      let mapping = booking.calendarEvents[0];
      if (mapping?.syncedVersion === booking.version) continue;
      if (writes >= 40) { remaining = true; break; }
      // Renueva y comprueba la autorización antes de cada operación externa.
      if (!(await database.calendarConnection.updateMany({ where: { ...fence, leaseUntil: { gt: new Date() } }, data: { leaseUntil: new Date(Date.now() + 90_000) } })).count) return true;
      if (!mapping) mapping = await database.calendarEvent.create({ data: { connectionId: candidate.id, bookingId: booking.id, operationId: randomUUID() } });
      const externalId = await transport.writeEvent(candidate.provider, tokens.accessToken, booking, mapping);
      await database.calendarEvent.update({ where: { id: mapping.id }, data: { externalId, syncedVersion: booking.version, removed: booking.status !== "CONFIRMED" } }); writes++;
    }
    // No borra una actualización que llegó mientras el proveedor respondía.
    await database.calendarConnection.updateMany({ where: { ...fence, syncVersion: candidate.syncVersion }, data: { nextSyncAt: new Date(Date.now() + (remaining ? 1000 : 3600_000)), attempts: 0, lastError: null, lastSyncAt: remaining ? candidate.lastSyncAt : new Date() } });
  } catch (error) {
    const code = error instanceof CalendarError ? error.code : "RETRY", retry = error instanceof CalendarError ? error.retryAfter : 0;
    const delay = Math.max(retry, Math.min(3600_000, 30_000 * 2 ** Math.min(candidate.attempts, 7)));
    await database.calendarConnection.updateMany({ where: fence, data: { ...(code === "REAUTH" ? { status: "REAUTH", refreshToken: null, nextSyncAt: null } : { nextSyncAt: new Date(Date.now() + delay) }), attempts: { increment: 1 }, lastError: code } });
  } finally { await database.calendarConnection.updateMany({ where: { id: candidate.id, leaseToken }, data: { leaseToken: null, leaseUntil: null } }); }
  return true;
}
