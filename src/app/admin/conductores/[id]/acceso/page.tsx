import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { DriverAccessForm } from "@/components/admin/driver-access-form";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { serviceAvailable, serviceDate } from "@/lib/subscription";
export default async function AccessPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params;
  const driver = await db().driver.findUnique({ where: { id }, select: { name: true, serviceStartsAt: true, serviceExpiresAt: true, user: { select: { username: true, active: true } }, servicePeriods: { orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!driver) notFound();
  return <><div className="workspace-heading"><div><Link className="text-link" href={`/admin/conductores/${id}/editar`}>← Volver al conductor</Link><h1>Vigencia y acceso<span>.</span></h1><p>{driver.name}</p></div></div><div className="detail-grid"><section className="detail-card"><h2>Servicio de 365 días</h2>{driver.serviceStartsAt && driver.serviceExpiresAt ? <p><strong>{serviceAvailable(driver) ? "Vigente" : driver.serviceStartsAt > new Date() ? "Todavía no comienza" : "Vencido"}</strong><br />Inicio: {serviceDate(driver.serviceStartsAt)}<br />Vencimiento: {serviceDate(driver.serviceExpiresAt)}</p> : <p>Vigencia pendiente de asignar. El servicio existente sigue disponible hasta que asignes sus fechas.</p>}<SubscriptionForm id={id} configured={Boolean(driver.serviceExpiresAt)} /><h3>Historial de vigencia</h3>{driver.servicePeriods.length ? <ul>{driver.servicePeriods.map(period => <li key={period.id}>{period.action === "renew" ? "Renovación" : "Asignación de fechas"} · {serviceDate(period.createdAt)} · hasta {serviceDate(period.expiresAt)}<br />Referencia: {period.reference}</li>)}</ul> : <p>Sin cambios registrados.</p>}</section><section className="detail-card"><h2>Acceso del conductor</h2><DriverAccessForm id={id} username={driver.user?.username} active={driver.user?.active} /></section></div></>;
}
