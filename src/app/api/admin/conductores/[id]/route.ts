import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi, HttpError, json } from "@/lib/http";
import { driverSchema, fieldErrors } from "@/lib/validation";
import { saveDriver } from "@/lib/drivers";
import { readProfileRequest } from "@/lib/profile-photo";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const actor = await requireApiAdmin(); assertOrigin(request);
    const { id } = await context.params;
    if (!id || id.length > 191) throw new HttpError(404, "No se encontró el conductor.");
    const { body, file } = await readProfileRequest(request, `admin:${actor.id}`);
    const result = driverSchema.safeParse(body);
    if (!result.success) throw new HttpError(400, "Revisa los campos del formulario.", fieldErrors(result.error));
    return json(await saveDriver(result.data, id, file));
  });
}
