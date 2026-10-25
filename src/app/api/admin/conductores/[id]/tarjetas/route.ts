import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { cardOperationSchema } from "@/lib/card-validation";
import { operateCard } from "@/lib/cards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireApiAdmin();
    assertOrigin(request);
    const parsed = cardOperationSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa la referencia y confirma la recuperación y las pruebas de la tarjeta.");
    return json(await operateCard((await params).id, admin.id, parsed.data));
  });
}
