import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { manualBookingSchema } from "@/lib/booking-validation";
import { fieldErrors } from "@/lib/validation";
import { saveBooking } from "@/lib/bookings";
export async function GET() {
  return handleApi(async () => { const actor = await requireApiDriver(); return json({ trips: await db().booking.findMany({ where: { driverId: actor.driverId }, orderBy: { startsAt: "desc" }, take: 100 }) }); });
}
export async function POST(request: Request) {
  return handleApi(async () => {
    await requireApiDriver(); assertOrigin(request);
    const parsed = manualBookingSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa los datos del viaje.", fieldErrors(parsed.error));
    return json(await saveBooking(parsed.data), 201);
  });
}
