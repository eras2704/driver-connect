import { publicDriver } from "@/lib/public-driver";
import { contactVcard } from "@/lib/vcard";
import { authConfiguration } from "@/lib/security";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const driver = await publicDriver((await params).slug);
  if (!driver) return new Response("Perfil no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(contactVcard(driver, `${authConfiguration().origin}/conductor/${driver.slug}`), { headers: {
    "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `attachment; filename="${driver.slug}.vcf"`,
    "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store",
  } });
}
