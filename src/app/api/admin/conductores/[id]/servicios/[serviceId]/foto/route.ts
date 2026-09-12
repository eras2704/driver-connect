import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi } from "@/lib/http";
import { saveServicePhoto, deleteServicePhoto } from "@/lib/service-photos";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; serviceId: string }> };
export async function POST(request: Request, { params }: Context) {
  return handleApi(async () => {
    const actor = await requireApiAdmin(); assertOrigin(request);
    const { id, serviceId } = await params;
    return saveServicePhoto(request, id, serviceId, `admin:${actor.id}`);
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return handleApi(async () => {
    await requireApiAdmin(); assertOrigin(request);
    const { id, serviceId } = await params;
    return deleteServicePhoto(id, serviceId);
  });
}
