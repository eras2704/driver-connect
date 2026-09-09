import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { requestBookingSchema } from "@/lib/booking-validation";
import { fieldErrors } from "@/lib/validation";
import { requestBooking } from "@/lib/bookings";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleApi(async () => {
    assertOrigin(request);
    const { slug } = await params;
    if (!/^[a-z0-9-]{3,80}$/.test(slug) || slug === "demo") throw new HttpError(404, "Perfil no disponible.");
    const parsed = requestBookingSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa los datos del viaje y el consentimiento.", fieldErrors(parsed.error));
    return json(await requestBooking(slug, parsed.data), 201);
  });
}
