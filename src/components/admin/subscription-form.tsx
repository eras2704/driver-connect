"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function SubscriptionForm({ id, configured }: { id: string; configured: boolean }) {
  const router = useRouter(), [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const attempt = useRef<{ body: string; requestId: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>, action: "dates" | "renew") {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    const values = action === "dates" ? { action, startsAt: data.get("startsAt"), reference: data.get("reference") } : { action, reference: data.get("reference"), paymentConfirmed: data.get("paymentConfirmed") === "on" };
    const body = JSON.stringify(values);
    if (attempt.current?.body !== body) attempt.current = { body, requestId: crypto.randomUUID() };
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/conductores/${id}/suscripcion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, requestId: attempt.current!.requestId }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "No se pudo guardar."); return; }
      setMessage(action === "renew" ? "Renovación registrada: 365 días adicionales." : "Fechas del servicio guardadas.");
      form.reset(); attempt.current = null; router.refresh();
    } catch { setMessage("No se pudo confirmar el resultado. Reintenta con los mismos datos para evitar duplicar la operación."); }
    finally { setPending(false); }
  }
  return <><form className="access-form" onSubmit={e => submit(e, "dates")}><h3>{configured ? "Corregir fecha de inicio" : "Asignar vigencia"}</h3><label>Inicio del servicio<input type="date" name="startsAt" required min="2000-01-01" max="2099-12-31" /></label><label>Referencia o motivo<input name="reference" required maxLength={191} /></label><p>El vencimiento será 365 días después, a las 00:00 de Panamá. Corregir esta fecha reemplaza la vigencia actual y queda registrado.</p><button className="button button-secondary" disabled={pending}>Guardar fechas</button></form>{configured && <form className="access-form" onSubmit={e => submit(e, "renew")}><h3>Renovar servicio</h3><label>Referencia del pago<input name="reference" required maxLength={191} /></label><label className="consent-label"><input type="checkbox" name="paymentConfirmed" required />Confirmo que recibimos el pago de la renovación.</label><p>Agrega 365 días desde el vencimiento actual; si ya venció, desde hoy. No cambia el QR ni restablece la contraseña.</p><button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Registrar pago y renovar 365 días"}</button></form>}{message && <p role="status">{message}</p>}</>;
}
