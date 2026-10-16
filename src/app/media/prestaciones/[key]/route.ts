import { db } from "@/lib/db";
import { currentDriver } from "@/lib/driver-session";
import { currentAdmin } from "@/lib/admin-session";
import { serviceAvailable } from "@/lib/subscription";
import { loadPhoto } from "@/lib/photo-storage";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) return new Response(null, { status: 404 });
  const service = await db().profileService.findUnique({ where: { photoStorageKey: key }, include: { driver: { select: { active: true, serviceStartsAt: true, serviceExpiresAt: true } } } });
  if (!service) return new Response(null, { status: 404 });
  if (!(service.active && service.driver.active && serviceAvailable(service.driver)) && (await currentDriver())?.driverId !== service.driverId && !(await currentAdmin())) return new Response(null, { status: 404 });
  try { return new Response(new Uint8Array(await loadPhoto(key)), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, noarchive" } }); } catch { return new Response(null, { status: 404 }); }
}
