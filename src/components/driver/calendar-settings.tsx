"use client";
import { useState } from "react";
import { appleSubscriptionUrl } from "@/lib/calendar";
export function CalendarSettings({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function action(value: string) {
    setPending(true); setError("");
    try { const response = await fetch("/api/driver/calendario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value }) }); const result = await response.json(); if (!response.ok) { setError(result.error); return; } setUrl(result.url); }
    catch { setError("No pudimos actualizar la conexión. Intenta de nuevo."); } finally { setPending(false); }
  }
  const apple = url && appleSubscriptionUrl(url);
  return <div>{url ? <><p className="calendar-help">Este enlace privado permite consultar tus viajes confirmados. Compártelo sólo con tu aplicación de calendario.</p><input aria-label="Dirección privada de suscripción" className="private-url" readOnly value={url} onFocus={e => e.target.select()} /><div className="calendar-options">{apple ? <a className="button button-primary" href={apple}>Conectar Calendario de iPhone ↗</a> : <p className="calendar-help">Para conectar iPhone, el sitio necesita una dirección HTTPS pública.</p>}</div><p className="calendar-help">iPhone te pedirá confirmar una vez. Los cambios y cancelaciones aparecerán cuando Calendario sincronice. La aplicación decide la frecuencia.</p><div className="detail-actions"><button className="button button-secondary" disabled={pending} onClick={() => action("rotate")}>Renovar enlace privado</button><button className="button button-secondary" disabled={pending} onClick={() => action("disable")}>Desconectar calendario</button></div><p className="calendar-help">Renovar o desconectar invalida el enlace anterior. Las copias ya guardadas en otro calendario no se borran de tu teléfono.</p></> : <><p className="calendar-help">Conecta una agenda de sólo lectura con tus viajes confirmados. Incluye horarios, recogida y destino; omite nombres, teléfonos y notas de pasajeros.</p><button className="button button-primary" disabled={pending} onClick={() => action("enable")}>{pending ? "Preparando…" : "Activar mi calendario privado"}</button></>}{error && <p role="alert" className="form-error">{error}</p>}</div>;
}
