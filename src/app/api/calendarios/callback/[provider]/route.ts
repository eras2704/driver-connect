import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authConfiguration } from "@/lib/security";
import { currentDriver } from "@/lib/driver-session";
import { passengerPath } from "@/lib/calendar-access";
import { cookieOptions, OAUTH_COOKIE, VISITOR_COOKIE } from "@/lib/cloud-calendar/access";
import { digest, decrypt, encrypt } from "@/lib/cloud-calendar/crypto";
import { exchangeCode } from "@/lib/cloud-calendar/providers";
import { disconnected } from "@/lib/cloud-calendar/queue";
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const jar = await cookies(); let target = "/calendario/conexion?estado=error";
  try {
    const route = (await params).provider, provider = route === "google" ? "GOOGLE" : route === "microsoft" ? "MICROSOFT" : null;
    const url = new URL(request.url), state = url.searchParams.get("state"), browser = jar.get(OAUTH_COOKIE)?.value;
    if (!provider || !state || state.length > 128 || !browser) throw new Error();
    const stored = await db().$transaction(async tx => {
      const record = await tx.calendarOAuthState.findUnique({ where: { stateHash: digest(state) } });
      if (!record || record.provider !== provider || record.browserHash !== digest(browser) || record.expiresAt <= new Date()) throw new Error();
      const consumed = await tx.calendarOAuthState.deleteMany({ where: { stateHash: record.stateHash, browserHash: digest(browser), expiresAt: { gt: new Date() } } });
      if (!consumed.count) throw new Error(); return record;
    });
    if (stored.driverUserId) { const driver = await currentDriver(); if (driver?.userId !== stored.driverUserId || driver.mustChangePassword) throw new Error(); }
    else if (stored.ownerKey !== `passenger:${stored.bookingId}:${digest(jar.get(VISITOR_COOKIE)?.value || "")}`) throw new Error();
    if (url.searchParams.has("error")) { target = "/calendario/conexion?estado=cancelado"; throw new Error(); }
    const tokens = await exchangeCode(provider, url.searchParams, state, decrypt(stored.verifier, stored.stateHash)), accountHash = digest(`${provider}:${tokens.accountId}`);
    target = await db().$transaction(async tx => {
      // Serializa con revocaciones y cambios de acceso del propietario.
      let returnPath = "/panel/calendario";
      if (stored.driverUserId) {
        await tx.$queryRaw`SELECT id FROM DriverUser WHERE id = ${stored.driverUserId} FOR UPDATE`;
        const user = await tx.driverUser.findUnique({ where: { id: stored.driverUserId } }); if (!user?.active || user.mustChangePassword || user.accessVersion !== stored.ownerVersion) throw new Error();
      } else {
        await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${stored.bookingId} FOR UPDATE`;
        const trip = await tx.booking.findUnique({ where: { id: stored.bookingId! } }); if (!trip || trip.status !== "CONFIRMED" || trip.endsAt <= new Date() || trip.passengerVersion !== stored.ownerVersion) throw new Error(); returnPath = passengerPath(trip);
      }
      await tx.calendarConnection.updateMany({ where: { ownerKey: stored.ownerKey }, data: disconnected });
      const connection = await tx.calendarConnection.upsert({ where: { ownerKey_provider_accountHash: { ownerKey: stored.ownerKey, provider, accountHash } }, create: { ownerKey: stored.ownerKey, provider, accountHash, accountLabel: tokens.label, ownerVersion: stored.ownerVersion, driverUserId: stored.driverUserId, bookingId: stored.bookingId }, update: { accountLabel: tokens.label, ownerVersion: stored.ownerVersion, syncVersion: { increment: 1 } } });
      await tx.calendarConnection.update({ where: { id: connection.id }, data: { status: "ACTIVE", refreshToken: encrypt(tokens.refreshToken, connection.id), nextSyncAt: new Date(), lastError: null, attempts: 0 } });
      return `${returnPath}?calendario=conectado`;
    });
  } catch { /* Nunca registrar códigos OAuth, enlaces privados ni respuestas del proveedor. */ }
  jar.set(OAUTH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  const response = NextResponse.redirect(new URL(target, authConfiguration().origin), 303);
  response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer"); response.headers.set("X-Robots-Tag", "noindex, nofollow"); return response;
}
