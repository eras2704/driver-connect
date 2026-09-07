import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
export default async function AdminDashboard() {
  await requireAdmin();
  const [total, active, verified, recent] = await Promise.all([
    db().driver.count(), db().driver.count({ where: { active: true } }), db().driver.count({ where: { verified: true } }),
    db().driver.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, slug: true, active: true, location: true } }),
  ]);
  return <><div className="admin-heading"><div><span className="eyebrow">ADMINISTRACIÓN</span><h1>Tu comunidad,<br /><em>en un solo lugar.</em></h1></div><Link className="button button-primary" href="/admin/conductores/nuevo">+ Nuevo conductor</Link></div><div className="admin-stats">{[[total, "Conductores"], [active, "Perfiles publicados"], [verified, "Conductores verificados"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><section className="admin-card"><div className="admin-card-heading"><h2>Últimos conductores</h2><Link href="/admin/conductores">Ver todos →</Link></div>{recent.length ? <ul className="driver-list">{recent.map((driver) => <li key={driver.id}><div><strong>{driver.name}</strong><span>{driver.location || "Sin ubicación"}</span></div><span className={`status-pill ${driver.active ? "published" : ""}`}>{driver.active ? "Publicado" : "Borrador"}</span><Link href={`/admin/conductores/${driver.id}/editar`}>Editar →</Link></li>)}</ul> : <div className="admin-empty"><h3>Todo empieza con tu primer conductor.</h3><p>Crea su perfil y publícalo cuando la información esté lista.</p><Link className="button button-primary" href="/admin/conductores/nuevo">Crear primer conductor</Link></div>}</section></>;
}
