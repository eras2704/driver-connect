"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { usePublicLanguage } from "./public-language";

const KEY = "dc-appearance";
type Theme = "system" | "light" | "dark";
let sessionPreference: Theme | undefined;
function preference(): Theme { if (sessionPreference) return sessionPreference; try { const value = localStorage.getItem(KEY); return value === "light" || value === "dark" ? value : "system"; } catch { return "system"; } }
function apply() {
  const choice = preference(), dark = choice === "dark" || choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#081728" : "#eaf1f8");
}
function subscribe(callback: () => void) {
  const query = matchMedia("(prefers-color-scheme: dark)");
  const update = (event: Event) => { if (event.type === "storage") sessionPreference = undefined; apply(); callback(); };
  query.addEventListener("change", update); window.addEventListener("storage", update); window.addEventListener("dc-theme", update); apply();
  return () => { query.removeEventListener("change", update); window.removeEventListener("storage", update); window.removeEventListener("dc-theme", update); };
}
export function ThemeControl() {
  const pathname = usePathname();
  const { t } = usePublicLanguage(pathname === "/" || pathname.startsWith("/conductor/"), false);
  const selected = useSyncExternalStore(subscribe, preference, () => "system" as Theme);
  return <div className="appearance-bar"><label htmlFor="dc-theme">{t("Apariencia", "Appearance")}</label><select id="dc-theme" value={selected} onChange={event => { sessionPreference = event.target.value as Theme; try { localStorage.setItem(KEY, event.target.value); } catch { /* La preferencia sigue disponible para esta visita. */ } document.documentElement.dataset.theme = event.target.value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : event.target.value; window.dispatchEvent(new Event("dc-theme")); }}><option value="system">{t("Según mi dispositivo", "Use device settings")}</option><option value="light">{t("Claro · Plata azul", "Light · Blue silver")}</option><option value="dark">{t("Oscuro · Azul noche", "Dark · Midnight blue")}</option></select></div>;
}
