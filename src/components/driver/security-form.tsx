"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function SecurityForm() {
  const router = useRouter(), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError("");
    try { const response = await fetch("/api/driver/seguridad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); if (!response.ok) { setError(result.error); return; } router.replace("/login-conductor"); router.refresh(); }
    catch { setError("No pudimos cambiar la contraseña. Intenta de nuevo."); } finally { setPending(false); }
  }
  return <form className="access-form" onSubmit={submit}><label>Contraseña actual<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={200} /></label><label>Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label><label>Repite la nueva contraseña<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label><p className="calendar-help">Usa al menos 12 caracteres. Al guardar, se cerrarán las sesiones anteriores y podrás entrar con tu nueva contraseña.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar nueva contraseña"}</button></form>;
}
