"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../icon";
export function PortalNav({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  return <nav className="portal-nav" aria-label="Espacio del conductor">{[["/panel", "Mi resumen", "grid"], ["/panel/agenda", "Agenda de viajes", "calendar"], ["/panel/perfil", "Mi perfil y vehículo", "user"], ["/panel/fotos", "Mis fotos", "grid"], ["/panel/calendario", "Conectar calendario", "globe"], ["/panel/seguridad", "Seguridad", "shield"]].map(([href, label, icon]) => <Link key={href} href={demo ? "/login-conductor" : href} aria-current={(demo ? href === "/panel/agenda" : pathname === href || href !== "/panel" && pathname.startsWith(href + "/")) ? "page" : undefined}><Icon name={icon} />{label}</Link>)}</nav>;
}
