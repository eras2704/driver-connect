"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function PrivateLink({ url, refresh = false }: { url: string; refresh?: boolean }) {
  const [message, setMessage] = useState(""), router = useRouter();
  return <div><label className="calendar-help">Enlace privado de este viaje<input className="private-url" value={url} readOnly onFocus={event => event.target.select()} /></label><div className="detail-actions"><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage("Enlace copiado."); } catch { setMessage("Selecciona el enlace y cópialo."); } }}>Copiar enlace</button>{refresh && <button className="button button-secondary" onClick={() => router.refresh()}>Actualizar estado</button>}</div><p className="calendar-help" role="status">{message}</p></div>;
}
