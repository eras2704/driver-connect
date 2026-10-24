"use client";
import { useState } from "react";
import { Icon } from "./icon";
import { translatePublic, type PublicLanguage } from "@/lib/public-locale";

export function ShareProfile({ path = "/conductor/demo", title = "Daniel Ríos · Driver Connect (muestra)", language = "es" }: { path?: string; title?: string; language?: PublicLanguage }) {
  const t = (es: string, en: string) => translatePublic(language, es, en);
  const [status, setStatus] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  async function share() {
    const url = new URL(path, window.location.origin).href;
    setStatus("");
    setManualUrl("");
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); setStatus(t("Enlace copiado.", "Link copied.")); }
    catch { setManualUrl(url); setStatus(t("Selecciona y copia el enlace.", "Select and copy the link.")); }
  }
  return <div className="share-control">
    <button type="button" className="button button-secondary" onClick={share}><Icon name="share" />{t("Compartir perfil", "Share profile")}</button>
    <span className="share-status" role="status">{status}</span>
    {manualUrl && <input className="share-url" aria-label={t("Enlace del perfil para copiar", "Profile link to copy")} readOnly value={manualUrl} onFocus={(event) => event.target.select()} />}
  </div>;
}
