import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { driverSchema, fieldErrors } from "@/lib/validation";
import { saveDriver } from "@/lib/drivers";

export async function GET() {
  return handleApi(async () => {
    await requireApiAdmin();
    return json({ drivers: await db().driver.findMany({ take: 100, orderBy: { createdAt: "desc" }, select: { id: true, name: true, slug: true, active: true } }) });
  });
}
export async function POST(request: Request) {
  return handleApi(async () => {
    await requireApiAdmin(); assertOrigin(request);
    const result = driverSchema.safeParse(await readJson(request));
    if (!result.success) throw new HttpError(400, "Revisa los campos del formulario.", fieldErrors(result.error));
    return json(await saveDriver(result.data), 201);
  });
}
