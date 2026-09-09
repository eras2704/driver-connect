import { calendarDriver, feedResponse } from "@/lib/calendar-access";
import { calendarFeed } from "@/lib/calendar";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params, user = await calendarDriver(id, token);
  if (!user) return new Response("Calendario no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });
  const trips = await db().booking.findMany({ where: { driverId: user.driverId, wasConfirmed: true, endsAt: { gte: new Date(Date.now() - 90 * 86400_000) } }, orderBy: { startsAt: "asc" }, select: { id: true, serviceName: true, pickup: true, destination: true, startsAt: true, endsAt: true, status: true, version: true, updatedAt: true } });
  return feedResponse(calendarFeed(trips, "Driver Connect · Mis viajes"));
}
