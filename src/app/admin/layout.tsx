import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { LogoutButton } from "@/components/admin/logout-button";

export const metadata: Metadata = { title: "Administración | Driver Connect", description: "Gestiona los perfiles de conductores de Driver Connect.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <div className="admin-shell"><header className="admin-header"><Link href="/admin" className="footer-brand">Driver Connect<span>.</span></Link><nav aria-label="Administración"><Link href="/admin">Resumen</Link><Link href="/admin/conductores">Conductores</Link></nav><div className="admin-identity"><span>{admin.name}</span><LogoutButton /></div></header><main className="admin-main">{children}</main><footer className="admin-footer">Driver Connect · Administración</footer></div>;
}
