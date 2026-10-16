import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi } from "@/lib/http";
import { saveCustomService, removeCustomService } from "@/lib/custom-services";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleApi(async () => { await requireApiAdmin(); assertOrigin(request); return saveCustomService(request, (await params).id); }); }
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleApi(async () => { await requireApiAdmin(); assertOrigin(request); return removeCustomService(request, (await params).id); }); }
