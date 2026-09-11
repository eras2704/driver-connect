import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi, HttpError, json } from "@/lib/http";
import { driverSchema, fieldErrors } from "@/lib/validation";
import { saveDriver } from "@/lib/drivers";
import { readProfileRequest } from "@/lib/profile-photo";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    await requireApiAdmin();
    return json({ drivers: await db().driver.findMany({ take: 100, orderBy: { createdAt: "desc" }, select: { id: true, name: true, slug: true, active: true } }) });
  });
}
export async function POST(request: Request) {
  return handleApi(async () => {
    const actor = await requireApiAdmin(); assertOrigin(request);
    const { body, file } = await readProfileRequest(request, `admin:${actor.id}`);
    const result = driverSchema.safeParse(body);
    if (!result.success) throw new HttpError(400, "Revisa los campos del formulario.", fieldErrors(result.error));
    return json(await saveDriver(result.data, undefined, file), 201);
  });
}
