import { passengerBooking, feedResponse } from "@/lib/calendar-access";
import { calendarFeed } from "@/lib/calendar";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params, booking = await passengerBooking(id, token);
  if (!booking) return new Response("Calendario no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return feedResponse(calendarFeed(booking.wasConfirmed ? [booking] : [], "Driver Connect · Mi viaje"));
}
