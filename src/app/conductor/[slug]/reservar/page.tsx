import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TripForm } from "@/components/booking/trip-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitar traslado | Driver Connect", description: "Coordina tu próximo viaje con tu conductor.", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ReservePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ servicio?: string }> }) {
  const { slug } = await params, selection = (await searchParams).servicio;
  if (slug === "demo" || !/^[a-z0-9-]{3,80}$/.test(slug)) notFound();
  const driver = await db().driver.findUnique({ where: { slug }, select: { name: true, active: true, user: { select: { active: true } }, services: { where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } } } });
  if (!driver?.active || !driver.user?.active || !driver.services.length) notFound();
  return <main className="private-booking"><header className="private-booking-header"><Link className="footer-brand" href={`/conductor/${slug}`}>Driver Connect<span>.</span></Link><Link className="text-link" href={`/conductor/${slug}`}>← Perfil del conductor</Link></header><div className="workspace-heading"><div><span className="eyebrow">EL PRÓXIMO DESTINO LO ELIGES TÚ</span><h1>Planeemos tu viaje<span>.</span></h1><p>Envía tu solicitud a {driver.name}.</p></div></div><div className="detail-grid"><TripForm slug={slug} services={driver.services} defaultServiceId={driver.services.find(s => s.name === selection)?.id} /><aside className="reservation-intro"><span className="eyebrow">ASÍ DE SENCILLO</span><h2>De tu puerta<br /><em>a tu destino.</em></h2><p>Atención directa con tu conductor, desde el primer contacto.</p><div className="reservation-steps">{[["01", "Cuéntanos tu recorrido", "Fecha, recogida y destino. Sólo los datos necesarios para coordinar."], ["02", "Acuerda los detalles", "Tu conductor comprobará disponibilidad, duración y precio contigo."], ["03", "Lleva el viaje contigo", "Guarda tu enlace privado y añade el viaje confirmado al calendario del teléfono."]].map(([number, title, text]) => <div key={number}><i>{number}</i><div><strong>{title}</strong><small>{text}</small></div></div>)}</div></aside></div></main>;
}
