import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { ProfileQrCard } from "@/components/profile-qr-card";
import { CardManager } from "@/components/admin/card-manager";
import { authConfiguration } from "@/lib/security";

export default async function CardsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const driver = await db().driver.findUnique({ where: { id }, include: { cards: true } });
  if (!driver) notFound();
  const [pending, free, history] = await Promise.all([
    db().cardUpgrade.findFirst({ where: { driverId: id, status: "PREPARED" } }),
    db().physicalCard.findMany({ where: { driverId: null, kind: "NORMAL", releaseUpgradeId: { not: null } }, orderBy: { createdAt: "asc" }, take: 200 }),
    db().cardEvent.findMany({ where: { OR: [{ fromDriverId: id }, { toDriverId: id }] }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return <>
    <div className="admin-heading"><div><span className="eyebrow">TARJETAS Y QR</span><h1>{driver.name}</h1><p>Recupera tarjetas normales después de un upgrade a premium.</p></div><Link href={`/admin/conductores/${id}/editar`} className="button button-secondary">Volver al perfil</Link></div>
    <section className="detail-card"><h2>Antes de reutilizar un QR</h2><p>Solo administración puede completar el cambio. Todas las copias y fotos del QR recuperado dirigirán al siguiente conductor. Si el enlace impreso era también la dirección actual del perfil, esta cambiará al enlace premium al completar el upgrade. Los demás enlaces históricos siguen en su perfil.</p><p>Dirección actual: /conductor/{driver.slug}</p><p>QR principal: /conductor/{driver.qrSlug || driver.slug}</p></section>
    {pending && <><h2>Tarjeta premium preparada — compruébala antes de liberar la normal</h2><ProfileQrCard slug={driver.slug} qrSlug={pending.premiumSlug} name={driver.name} published={driver.active} /></>}
    <CardManager driverId={id} pendingId={pending?.id} premium={driver.cards.some(card => card.slug === driver.qrSlug && card.kind === "PREMIUM")} freeCards={free.map(card => card.slug)} origin={authConfiguration().origin} />
    <section className="detail-card"><h2>Tarjetas asignadas</h2>{driver.cards.length ? <ul>{driver.cards.map(card => <li key={card.slug}>{card.kind === "PREMIUM" ? "Premium" : "Normal"}: <Link href={`/conductor/${card.slug}`} target="_blank" rel="noopener noreferrer">/conductor/{card.slug}</Link></li>)}</ul> : <p>La tarjeta actual se registrará cuando prepares su upgrade. Su QR sigue funcionando.</p>}</section>
    <section className="detail-card"><h2>Historial reciente</h2>{history.length ? <ul>{history.map(event => <li key={event.id}><strong>{event.action === "PREPARE" ? "Premium preparada" : event.action === "RELEASE" ? "Normal recuperada" : "Tarjeta reasignada"}</strong> · {event.createdAt.toISOString()}<p>QR: {event.cardSlug} · Administrador: {event.adminId} · Referencia: {event.reference}</p></li>)}</ul> : <p>No hay operaciones registradas.</p>}</section>
  </>;
}
