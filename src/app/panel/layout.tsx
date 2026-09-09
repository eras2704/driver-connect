import type { Metadata } from "next";
import { requireDriver } from "@/lib/driver-session";
import { PortalShell } from "@/components/driver/portal-shell";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi espacio | Driver Connect", description: "Gestiona tu agenda y tu perfil profesional.", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function PanelLayout({ children }: { children: React.ReactNode }) { const actor = await requireDriver(true); return <PortalShell name={actor.name} slug={actor.slug} published={actor.published}>{children}</PortalShell>; }
