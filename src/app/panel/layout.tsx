import { serviceDate, serviceExpiringSoon } from "@/lib/subscription";
import type { Metadata } from "next";
import { requireDriver } from "@/lib/driver-session";
import { PortalShell } from "@/components/driver/portal-shell";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi espacio | Driver Connect", description: "Gestiona tu agenda y tu perfil profesional.", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function PanelLayout({ children }: { children: React.ReactNode }) { const actor = await requireDriver(true); return <PortalShell name={actor.name} slug={actor.slug} published={actor.published}><section className="detail-card" aria-label="Vigencia del servicio">{actor.serviceExpiresAt ? <p>Tu servicio vence el <strong>{serviceDate(actor.serviceExpiresAt)}</strong>.{serviceExpiringSoon(actor.serviceExpiresAt) ? " Contacta a la administración para renovar por 365 días." : ""}</p> : <p>La administración tiene pendiente asignar la fecha de vigencia de tu servicio.</p>}</section>{children}</PortalShell>; }
