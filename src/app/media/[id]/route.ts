import { db } from "@/lib/db";
import { currentDriver } from "@/lib/driver-session";
import { currentAdmin } from "@/lib/admin-session";
import { loadPhoto } from "@/lib/photo-storage";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,32}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const photo = await db().driverPhoto.findUnique({ where: { id }, include: { driver: { select: { active: true } } } });
    if (!photo) return new Response(null, { status: 404 });
    if (!photo.driver.active && (await currentDriver())?.driverId !== photo.driverId && !(await currentAdmin())) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(await loadPhoto(photo.storageKey)), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, noarchive", "Content-Security-Policy": "default-src 'none'" } });
  } catch { return new Response(null, { status: 404 }); }
}
