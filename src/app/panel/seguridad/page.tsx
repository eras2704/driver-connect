import { requireDriver } from "@/lib/driver-session";
import { SecurityForm } from "@/components/driver/security-form";
export default async function SecurityPage() { const actor = await requireDriver(true); return <><div className="workspace-heading"><div><span className="eyebrow">TU CUENTA, PROTEGIDA</span><h1>Seguridad<span>.</span></h1><p>{actor.mustChangePassword ? "Antes de continuar, elige tu contraseña personal." : "Actualiza tu contraseña cuando lo necesites."}</p></div></div><section className="detail-card" style={{ maxWidth: 560 }}><SecurityForm /></section></>; }
