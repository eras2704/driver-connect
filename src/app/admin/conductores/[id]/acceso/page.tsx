import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { DriverAccessForm } from "@/components/admin/driver-access-form";
export default async function AccessPage({ params }: { params: Promise<{ id: string }> }) { await requireAdmin(); const { id } = await params; const driver = await db().driver.findUnique({ where: { id }, select: { name: true, user: { select: { username: true, active: true } } } }); if (!driver) notFound(); return <><div className="workspace-heading"><div><Link className="text-link" href={`/admin/conductores/${id}/editar`}>← Volver al conductor</Link><h1>Acceso del conductor<span>.</span></h1><p>{driver.name}</p></div></div><section className="detail-card" style={{ maxWidth: 580 }}><DriverAccessForm id={id} username={driver.user?.username} active={driver.user?.active} /></section></>; }
