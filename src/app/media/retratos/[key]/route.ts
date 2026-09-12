import { db } from "@/lib/db";
import { currentDriver } from "@/lib/driver-session";
import { currentAdmin } from "@/lib/admin-session";
import { loadPhoto } from "@/lib/photo-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) return new Response(null, { status: 404 });
  try {
    const driver = await db().driver.findUnique({ where: { portraitStorageKey: key }, select: { id: true, active: true } });
    if (!driver) return new Response(null, { status: 404 });
    if (!driver.active && (await currentDriver())?.driverId !== driver.id && !(await currentAdmin())) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(await loadPhoto(key)), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, noarchive", "Content-Security-Policy": "default-src 'none'" } });
  } catch { return new Response(null, { status: 404 }); }
}
