import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi } from "@/lib/http";
import { saveServicePhoto, deleteServicePhoto } from "@/lib/service-photos";

export const runtime = "nodejs";
type Context = { params: Promise<{ serviceId: string }> };
export async function POST(request: Request, { params }: Context) {
  return handleApi(async () => {
    const actor = await requireApiDriver(); assertOrigin(request);
    return saveServicePhoto(request, actor.driverId, (await params).serviceId, actor.userId);
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return handleApi(async () => {
    const actor = await requireApiDriver(); assertOrigin(request);
    return deleteServicePhoto(actor.driverId, (await params).serviceId);
  });
}
