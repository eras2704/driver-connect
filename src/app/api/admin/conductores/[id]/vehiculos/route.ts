import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi } from "@/lib/http";
import { saveVehicle, removeVehicle } from "@/lib/vehicles";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleApi(async () => { await requireApiAdmin(); assertOrigin(request); return saveVehicle(request, (await params).id); }); }
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleApi(async () => { await requireApiAdmin(); assertOrigin(request); return removeVehicle(request, (await params).id); }); }
