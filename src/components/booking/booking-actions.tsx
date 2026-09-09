"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TripStatus } from "@/lib/calendar";
export function BookingActions({ id, version, status }: { id: string; version: number; status: TripStatus }) {
  const router = useRouter(), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function change(next: TripStatus) {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/driver/agenda/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next, version }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error); return; } router.refresh();
    } catch { setError("No pudimos actualizar el viaje. Intenta de nuevo."); } finally { setPending(false); }
  }
  return <>{["PENDING", "CONFIRMED"].includes(status) && <div className="detail-actions">{status === "PENDING" && <><button className="button button-primary" disabled={pending} onClick={() => change("CONFIRMED")}>Confirmar viaje</button><button className="button button-secondary" disabled={pending} onClick={() => change("REJECTED")}>Rechazar solicitud</button></>}{status === "CONFIRMED" && <button className="button button-secondary" disabled={pending} onClick={() => change("CANCELLED")}>Cancelar viaje</button>}</div>}{error && <p role="alert" className="form-error">{error}</p>}</>;
}
export function RotatePassengerLink({ id }: { id: string }) {
  const router = useRouter(), [pending, setPending] = useState(false), [error, setError] = useState("");
  return <><button className="text-link" disabled={pending} onClick={async () => { setPending(true); setError(""); try { const response = await fetch(`/api/driver/agenda/${id}/enlace`, { method: "POST" }); if (!response.ok) throw new Error(); router.refresh(); } catch { setError("No pudimos renovar el enlace."); } finally { setPending(false); } }}>{pending ? "Renovando…" : "Renovar enlace del pasajero"}</button><p className="calendar-help">El enlace anterior y su suscripción dejarán de funcionar. Comparte el nuevo enlace con el pasajero.</p>{error && <p className="form-error" role="alert">{error}</p>}</>;
}
