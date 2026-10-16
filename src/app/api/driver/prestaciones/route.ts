import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi } from "@/lib/http";
import { saveCustomService, removeCustomService } from "@/lib/custom-services";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleApi(async () => { const actor = await requireApiDriver(); assertOrigin(request); return saveCustomService(request, actor.driverId); }); }
export async function DELETE(request: Request) { return handleApi(async () => { const actor = await requireApiDriver(); assertOrigin(request); return removeCustomService(request, actor.driverId); }); }
