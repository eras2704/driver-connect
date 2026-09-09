import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { bookingStatusSchema, editBookingSchema } from "@/lib/booking-validation";
import { fieldErrors } from "@/lib/validation";
import { changeBookingStatus, saveBooking } from "@/lib/bookings";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireApiDriver(); assertOrigin(request);
    const { id } = await params, parsed = bookingStatusSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa el estado del viaje.");
    return json(await changeBookingStatus(id, parsed.data.status, parsed.data.version));
  });
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireApiDriver(); assertOrigin(request);
    const { id } = await params, parsed = editBookingSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa los datos del viaje.", fieldErrors(parsed.error));
    return json(await saveBooking(parsed.data, id, parsed.data.version));
  });
}
