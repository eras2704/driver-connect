"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePublicLanguage } from "../public-language";
import { publicBookingError } from "@/lib/public-booking-error";
import type { ManualBookingInput } from "@/lib/booking-validation";
export function TripForm({ slug, services = [], initial, id, version = 0, defaultServiceId = "", profileKey }: { profileKey?: string; defaultServiceId?: string; slug?: string; services?: { id: string; name: string; nameEn?: string | null }[]; initial?: ManualBookingInput; id?: string; version?: number }) {
  const { language, t } = usePublicLanguage(Boolean(slug));
  const router = useRouter(), nonce = useRef("");
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const field = (name: string, label: string, type = "text", value: string | number = "", required = true, max = 250) => <label htmlFor={name}>{label}<input id={name} name={name} type={type} required={required} defaultValue={value} maxLength={max} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />{errors[name] && <small className="field-error" id={`${name}-error`}>{errors[name]}</small>}</label>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget), text = (key: string) => String(form.get(key) || "");
    const data = { customerName: text("customerName"), phone: text("phone"), email: text("email"), pickup: text("pickup"), destination: text("destination"), startsAt: text("startsAt"), passengers: Number(text("passengers")), notes: text("notes") };
    if (!nonce.current) nonce.current = crypto.randomUUID();
    const payload = slug ? { ...data, serviceId: text("serviceId"), ...(profileKey ? { profileKey } : {}), requestId: nonce.current, consent: form.get("consent") === "on", website: text("website") } : { ...data, serviceName: text("serviceName"), duration: Number(text("duration")), ...(id ? { version } : {}) };
    setPending(true); setError(""); setErrors({});
    try {
      const response = await fetch(slug ? `/api/reservas/${slug}` : `/api/driver/agenda${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { setError(slug ? publicBookingError(language, result.error, response.status) : result.error || "No se pudo guardar el viaje."); setErrors(slug ? Object.fromEntries(Object.keys(result.fields || {}).map(key => [key, t("Revisa este campo.", "Check this field.")])) : result.fields || {}); return; }
      router.push(slug ? result.path : `/panel/agenda/${result.id}?guardado=1`); router.refresh();
    } catch { setError(t("No pudimos conectar. Tus datos siguen aquí; vuelve a intentar.", "Could not connect. Your details are still here; please try again.")); }
    finally { setPending(false); }
  }
  return <form className="booking-form" onSubmit={submit}>
    <section className="detail-card"><span className="eyebrow">{t("01 / TU RECORRIDO", "01 / YOUR JOURNEY")}</span><h2>{t("¿A dónde vamos?", "Where are we going?")}</h2><div className="form-grid">{slug ? <label htmlFor="serviceId">{t("Servicio", "Service")}<select id="serviceId" name="serviceId" required defaultValue={defaultServiceId}><option value="" disabled>{t("Selecciona un servicio", "Select a service")}</option>{services.map(s => <option value={s.id} key={s.id}>{language !== "es" && s.nameEn || s.name}</option>)}</select></label> : field("serviceName", t("Servicio", "Service"), "text", initial?.serviceName || "Traslado privado", true, 191)}{field("passengers", t("Pasajeros", "Passengers"), "number", initial?.passengers || 1)}{field("pickup", t("Punto de recogida", "Pickup location"), "text", initial?.pickup)}{field("destination", t("Destino", "Destination"), "text", initial?.destination)}<div>{field("startsAt", t("Fecha y hora de recogida", "Pickup date and time"), "datetime-local", initial?.startsAt)}<p className="calendar-help">{t("Hora de Panamá · UTC−5", "Panama time · UTC−5")}</p></div>{!slug && field("duration", "Duración estimada (minutos)", "number", initial?.duration || 60)}</div>{slug && <p className="calendar-help">{t("El conductor comprobará la duración y disponibilidad antes de confirmar.", "Your driver will check duration and availability before confirming.")}</p>}</section>
    <section className="detail-card"><span className="eyebrow">{t("02 / CONTACTO", "02 / CONTACT")}</span><h2>{slug ? t("Viajamos contigo.", "We're with you.") : "Datos del pasajero"}</h2><div className="form-grid">{field("customerName", t("Nombre del pasajero", "Passenger name"), "text", initial?.customerName, true, 100)}{field("phone", t("Teléfono con código de país", "Phone with country code"), "tel", initial?.phone, true, 32)}{field("email", t("Correo (opcional)", "Email (optional)"), "email", initial?.email, false, 191)}<label className="full-width" htmlFor="notes">{t("Información adicional (opcional)", "Additional information (optional)")}<textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={initial?.notes} placeholder={t("Número de vuelo, equipaje u otra información para coordinar.", "Flight number, luggage or other details to coordinate.")} /></label></div></section>
    {slug && <><label className="honeypot" aria-hidden="true">Sitio web<input name="website" autoComplete="off" tabIndex={-1} /></label><label className="consent-label"><input type="checkbox" name="consent" required /><span>{t("Acepto compartir estos datos con el conductor para coordinar el traslado. Enviar la solicitud no confirma disponibilidad ni precio.", "I agree to share these details with the driver to arrange the transfer. Sending this request does not confirm availability or price.")}</span></label></>}
    {error && <div className="form-error" role="alert">{error}{Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul>}</div>}
    <div className="form-footer"><Link className="button button-secondary" href={slug ? `/conductor/${slug}` : id ? `/panel/agenda/${id}` : "/panel/agenda"}>{t("Volver", "Back")}</Link><button disabled={pending} type="submit" className="button button-primary">{pending ? t("Guardando…", "Saving…") : slug ? t("Solicitar mi traslado →", "Request my transfer →") : id ? "Guardar cambios" : "Registrar viaje confirmado"}</button></div>
  </form>;
}
