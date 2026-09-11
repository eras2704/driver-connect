import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { requireApiDriver } from "../driver-session";
import { passengerBooking, passengerPath } from "../calendar-access";
import { HttpError } from "../http";
import { authConfiguration } from "../security";
import { digest } from "./crypto";
export const VISITOR_COOKIE = "dc_calendar_visitor", OAUTH_COOKIE = "dc_calendar_oauth";
export const cookieOptions = () => ({ httpOnly: true, secure: authConfiguration().secure, sameSite: "lax" as const, path: "/" });
export type Audience = { kind: "driver" } | { kind: "passenger"; id: string; token: string };
export async function calendarOwner(audience: Audience, createVisitor = false) {
  if (audience.kind === "driver") {
    const actor = await requireApiDriver(), user = await db().driverUser.findUniqueOrThrow({ where: { id: actor.userId } });
    return { ownerKey: `driver:${actor.userId}`, ownerVersion: user.accessVersion, driverUserId: actor.userId, bookingId: null, returnPath: "/panel/calendario", canConnect: true };
  }
  const booking = await passengerBooking(audience.id, audience.token); if (!booking) throw new HttpError(404, "El enlace del viaje ya no está disponible.");
  const jar = await cookies(); let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) { visitor = randomBytes(32).toString("hex"); if (createVisitor) jar.set(VISITOR_COOKIE, visitor, { ...cookieOptions(), maxAge: 365 * 86400 }); }
  return { ownerKey: `passenger:${booking.id}:${digest(visitor)}`, ownerVersion: booking.passengerVersion, driverUserId: null, bookingId: booking.id, returnPath: passengerPath(booking), canConnect: booking.status === "CONFIRMED" && booking.endsAt > new Date() };
}
