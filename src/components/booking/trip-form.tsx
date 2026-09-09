"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ManualBookingInput } from "@/lib/booking-validation";
export function TripForm({ slug, services = [], initial, id, version = 0, defaultServiceId = "" }: { defaultServiceId?: string; slug?: string; services?: { id: string; name: string }[]; initial?: ManualBookingInput; id?: string; version?: number }) {
  const router = useRouter(), nonce = useRef("");
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const field = (name: string, label: string, type = "text", value: string | number = "", required = true, max = 250) => <label htmlFor={name}>{label}<input id={name} name={name} type={type} required={required} defaultValue={value} maxLength={max} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />{errors[name] && <small className="field-error" id={`${name}-error`}>{errors[name]}</small>}</label>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget), text = (key: string) => String(form.get(key) || "");
    const data = { customerName: text("customerName"), phone: text("phone"), email: text("email"), pickup: text("pickup"), destination: text("destination"), startsAt: text("startsAt"), passengers: Number(text("passengers")), notes: text("notes") };
    if (!nonce.current) nonce.current = crypto.randomUUID();
    const payload = slug ? { ...data, serviceId: text("serviceId"), requestId: nonce.current, consent: form.get("consent") === "on", website: text("website") } : { ...data, serviceName: text("serviceName"), duration: Number(text("duration")), ...(id ? { version } : {}) };
    setPending(true); setError(""); setErrors({});
    try {
      const response = await fetch(slug ? `/api/reservas/${slug}` : `/api/driver/agenda${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "No se pudo guardar el viaje."); setErrors(result.fields || {}); return; }
      router.push(slug ? result.path : `/panel/agenda/${result.id}?guardado=1`); router.refresh();
    } catch { setError("No pudimos conectar. Tus datos siguen aquí; vuelve a intentar."); }
    finally { setPending(false); }
  }
  return <form className="booking-form" onSubmit={submit}>
    <section className="detail-card"><span className="eyebrow">01 / TU RECORRIDO</span><h2>¿A dónde vamos?</h2><div className="form-grid">{slug ? <label htmlFor="serviceId">Servicio<select id="serviceId" name="serviceId" required defaultValue={defaultServiceId}><option value="" disabled>Selecciona un servicio</option>{services.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label> : field("serviceName", "Servicio", "text", initial?.serviceName || "Traslado privado", true, 191)}{field("passengers", "Pasajeros", "number", initial?.passengers || 1)}{field("pickup", "Punto de recogida", "text", initial?.pickup)}{field("destination", "Destino", "text", initial?.destination)}<div>{field("startsAt", "Fecha y hora de recogida", "datetime-local", initial?.startsAt)}<p className="calendar-help">Hora de Panamá · UTC−5</p></div>{!slug && field("duration", "Duración estimada (minutos)", "number", initial?.duration || 60)}</div>{slug && <p className="calendar-help">El conductor comprobará la duración y disponibilidad antes de confirmar.</p>}</section>
    <section className="detail-card"><span className="eyebrow">02 / CONTACTO</span><h2>{slug ? "Viajamos contigo." : "Datos del pasajero"}</h2><div className="form-grid">{field("customerName", "Nombre del pasajero", "text", initial?.customerName, true, 100)}{field("phone", "Teléfono con código de país", "tel", initial?.phone, true, 32)}{field("email", "Correo (opcional)", "email", initial?.email, false, 191)}<label className="full-width" htmlFor="notes">Información adicional (opcional)<textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={initial?.notes} placeholder="Número de vuelo, equipaje u otra información para coordinar." /></label></div></section>
    {slug && <><label className="honeypot" aria-hidden="true">Sitio web<input name="website" autoComplete="off" tabIndex={-1} /></label><label className="consent-label"><input type="checkbox" name="consent" required /><span>Acepto compartir estos datos con el conductor para coordinar el traslado. Enviar la solicitud no confirma disponibilidad ni precio.</span></label></>}
    {error && <div className="form-error" role="alert">{error}{Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul>}</div>}
    <div className="form-footer"><Link className="button button-secondary" href={slug ? `/conductor/${slug}` : id ? `/panel/agenda/${id}` : "/panel/agenda"}>Volver</Link><button disabled={pending} type="submit" className="button button-primary">{pending ? "Guardando…" : slug ? "Solicitar mi traslado →" : id ? "Guardar cambios" : "Registrar viaje confirmado"}</button></div>
  </form>;
}
