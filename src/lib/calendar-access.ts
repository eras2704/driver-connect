import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { authConfiguration, hashToken, validTokenFormat } from "./security";
export function calendarToken(kind: "passenger" | "driver", id: string, version: number) { return hashToken(`calendar:${kind}:${id}:${version}`); }
function matches(token: string, expected: string) { return validTokenFormat(token) && timingSafeEqual(Buffer.from(token), Buffer.from(expected)); }
export function passengerPath(booking: { id: string; passengerVersion: number }) { return `/reserva/${booking.id}/${calendarToken("passenger", booking.id, booking.passengerVersion)}`; }
export function passengerFeedUrl(booking: { id: string; passengerVersion: number }) { return `${authConfiguration().origin}/calendario/reserva/${booking.id}/${calendarToken("passenger", booking.id, booking.passengerVersion)}`; }
export function driverFeedUrl(user: { id: string; calendarVersion: number }) { return `${authConfiguration().origin}/calendario/conductor/${user.id}/${calendarToken("driver", user.id, user.calendarVersion)}`; }
export async function passengerBooking(id: string, token: string) {
  if (id.length > 64 || !validTokenFormat(token)) return null;
  const booking = await db().booking.findUnique({ where: { id }, include: { driver: { select: { name: true, slug: true, whatsapp: true, phone: true, active: true } } } });
  if (!booking || !matches(token, calendarToken("passenger", id, booking.passengerVersion)) || booking.endsAt.getTime() < Date.now() - 90 * 86400_000) return null;
  return booking;
}
export async function calendarDriver(id: string, token: string) {
  if (id.length > 64 || !validTokenFormat(token)) return null;
  const user = await db().driverUser.findUnique({ where: { id }, select: { id: true, driverId: true, active: true, mustChangePassword: true, calendarEnabled: true, calendarVersion: true } });
  return user?.active && !user.mustChangePassword && user.calendarEnabled && matches(token, calendarToken("driver", id, user.calendarVersion)) ? user : null;
}
export function feedResponse(body: string) { return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" } }); }
