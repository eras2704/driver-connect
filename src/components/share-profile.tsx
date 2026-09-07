"use client";
import { useState } from "react";
import { Icon } from "./icon";

export function ShareProfile({ path = "/conductor/demo", title = "Daniel Ríos · Driver Connect (muestra)" }: { path?: string; title?: string }) {
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
    try { await navigator.clipboard.writeText(url); setStatus("Enlace copiado."); }
    catch { setManualUrl(url); setStatus("Selecciona y copia el enlace."); }
  }
  return <div className="share-control">
    <button type="button" className="button button-secondary" onClick={share}><Icon name="share" />Compartir perfil</button>
    <span className="share-status" role="status">{status}</span>
    {manualUrl && <input className="share-url" aria-label="Enlace del perfil para copiar" readOnly value={manualUrl} onFocus={(event) => event.target.select()} />}
  </div>;
}
