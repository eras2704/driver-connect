import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-session";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Acceso administrativo | Driver Connect", description: "Accede a la administración de Driver Connect.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await currentAdmin()) redirect("/admin");
  return <main className="login-shell"><section className="login-story"><Link className="footer-brand" href="/">Driver Connect<span>.</span></Link><div><span className="eyebrow">TU ESPACIO DE ADMINISTRACIÓN</span><h1>Cada perfil,<br /><em>en buenas manos.</em></h1><p>Gestiona a tus conductores y mantén su información al día.</p></div><span>Perfiles profesionales · Conexiones reales</span></section><section className="login-panel"><div><span className="eyebrow">BIENVENIDO</span><h2>Inicia sesión.</h2><p className="muted">Usa tu cuenta administrativa para continuar.</p><LoginForm /><p className="login-help">Si aún no tienes acceso, solicita la creación de tu cuenta al responsable del proyecto.</p></div></section></main>;
}
