"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CardManager({ driverId, pendingId, freeCards, premium, origin }: { driverId: string; pendingId?: string; freeCards: string[]; premium: boolean; origin: string }) {
  const router = useRouter();
  const request = useRef<{ payload: string; id: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [selection, setSelection] = useState("");
  const selected = freeCards.includes(selection) ? selection : freeCards[0] || "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget), action = String(form.get("action"));
    const values = action === "complete" ? { action, upgradeId: pendingId, premiumTested: form.get("premiumTested") === "on", normalReturned: form.get("normalReturned") === "on" } : action === "assign" ? { action, slug: form.get("slug"), reference: form.get("reference"), nfcRewritten: form.get("nfcRewritten") === "on" } : { action, reference: form.get("reference"), normalConfirmed: form.get("normalConfirmed") === "on" };
    const payload = JSON.stringify(values);
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/conductores/${driverId}/tarjetas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, requestId: request.current!.id }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "No se pudo actualizar la tarjeta."); return; }
      request.current = null;
      router.refresh();
    } catch { setError("No se pudo conectar. Puedes reintentar sin duplicar la operación."); }
    finally { setBusy(false); }
  }
  return <div className="detail-grid">
    <section className="detail-card"><h2>Upgrade de normal a premium</h2>
      {pendingId ? <form onSubmit={submit} className="booking-form">
        <input type="hidden" name="action" value="complete" />
        <p>Primero prueba el QR premium mostrado arriba. Al completar, el QR normal dejará de abrir este perfil y quedará disponible para otro conductor.</p>
        <label className="consent-label"><input type="checkbox" name="premiumTested" required /><span>Probé el QR y el NFC premium y ambos abren el perfil correcto.</span></label>
        <label className="consent-label"><input type="checkbox" name="normalReturned" required /><span>Recuperé físicamente la tarjeta normal y autorizo reutilizar su QR, incluidas sus copias.</span></label>
        <button disabled={busy} className="button button-primary">Completar upgrade y liberar normal</button>
      </form> : premium ? <p>La tarjeta principal ya es premium. Este flujo solo libera tarjetas normales por upgrade.</p> : <form onSubmit={submit} className="booking-form">
        <input type="hidden" name="action" value="prepare" />
        <p>Preparar crea el nuevo QR premium sin liberar todavía la tarjeta normal. El perfil, las fotos, las reservas y la vigencia permanecen en la misma cuenta.</p>
        <label>Referencia del upgrade<input name="reference" required minLength={3} maxLength={191} placeholder="Pedido o comprobante de la tarjeta premium" /></label>
        <label className="consent-label"><input type="checkbox" name="normalConfirmed" required /><span>Confirmé que la tarjeta actual a recuperar es normal.</span></label>
        <button disabled={busy} className="button button-primary">Preparar tarjeta premium</button>
      </form>}
    </section>
    <section className="detail-card"><h2>Asignar tarjeta normal recuperada</h2>
      {freeCards.length && !premium && !pendingId ? <form onSubmit={submit} className="booking-form">
        <input type="hidden" name="action" value="assign" />
        <p>Asignar a este conductor conserva el sticker. Cualquier copia de ese QR abrirá ahora este perfil. Su QR principal de descarga será el de esta tarjeta.</p>
        <label>QR disponible<select name="slug" required value={selected} onChange={event => setSelection(event.target.value)}>{freeCards.map(slug => <option key={slug} value={slug}>{slug}</option>)}</select></label>
        <label>Enlace para regrabar el NFC<input readOnly value={`${origin}/conductor/${selected}`} onFocus={event => event.target.select()} /></label>
        <label>Referencia de entrega<input name="reference" required minLength={3} maxLength={191} /></label>
        <label className="consent-label"><input type="checkbox" name="nfcRewritten" required /><span>Regrabé el NFC con el mismo enlace del QR de la tarjeta seleccionada.</span></label>
        <button disabled={busy} className="button button-primary">Asignar tarjeta a este conductor</button>
      </form> : <p>{premium || pendingId ? "No se reemplaza una tarjeta premium ni un upgrade pendiente por una normal recuperada." : "No hay tarjetas recuperadas disponibles. Aparecerán al completar un upgrade y confirmar la devolución."}</p>}
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
