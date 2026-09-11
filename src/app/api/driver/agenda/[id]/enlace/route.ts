import { disconnected } from "@/lib/cloud-calendar/queue";
import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { passengerPath } from "@/lib/calendar-access";
import { assertOrigin, handleApi, HttpError, json } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const actor = await requireApiDriver(); assertOrigin(request);
    const { id } = await params;
    const trip = await db().$transaction(async tx => {
      const updated = await tx.booking.updateMany({ where: { id, driverId: actor.driverId }, data: { passengerVersion: { increment: 1 } } });
      if (!updated.count) throw new HttpError(404, "No se encontró el viaje.");
      await tx.calendarConnection.updateMany({ where: { bookingId: id }, data: disconnected });
      return tx.booking.findUniqueOrThrow({ where: { id } });
    });
    return json({ path: passengerPath(trip) });
  });
}
