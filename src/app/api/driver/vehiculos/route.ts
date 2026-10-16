import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi } from "@/lib/http";
import { saveVehicle, removeVehicle } from "@/lib/vehicles";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleApi(async () => { const actor = await requireApiDriver(); assertOrigin(request); return saveVehicle(request, actor.driverId); }); }
export async function DELETE(request: Request) { return handleApi(async () => { const actor = await requireApiDriver(); assertOrigin(request); return removeVehicle(request, actor.driverId); }); }
