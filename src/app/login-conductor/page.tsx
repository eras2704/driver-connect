import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentDriver } from "@/lib/driver-session";
import { LoginForm } from "@/components/admin/login-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu espacio | Driver Connect", description: "Gestiona tu perfil y tus viajes.", robots: { index: false, follow: false } };
export default async function DriverLogin() {
  if (await currentDriver()) redirect("/panel");
  return <main className="login-shell"><section className="login-story"><Link className="footer-brand" href="/">Driver Connect<span>.</span></Link><div><span className="eyebrow">EL SIGUIENTE DESTINO EMPIEZA AQUÍ</span><h1>Tu trabajo.<br /><em>Tu espacio.</em></h1><p>Tu perfil, tus solicitudes y cada próximo viaje. Todo en un solo lugar.</p></div><span>Driver Connect · Para profesionales en movimiento</span></section><section className="login-panel"><div><span className="eyebrow">BIENVENIDO DE NUEVO</span><h2>Vamos contigo.</h2><p className="muted">Entra con tu cuenta de conductor.</p><LoginForm audience="driver" /><p className="login-help">Tu administrador te proporciona el primer acceso. Podrás elegir tu propia contraseña al entrar.</p><Link className="text-link" href="/demo/agenda">Conocer el espacio del conductor →</Link></div></section></main>;
}
