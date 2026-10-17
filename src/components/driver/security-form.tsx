"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/password-field";
export function SecurityForm() {
  const router = useRouter(), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError("");
    try { const response = await fetch("/api/driver/seguridad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); if (!response.ok) { setError(result.error); return; } router.replace("/login-conductor"); router.refresh(); }
    catch { setError("No pudimos cambiar la contraseña. Intenta de nuevo."); } finally { setPending(false); }
  }
  return <form className="access-form" onSubmit={submit}><PasswordField label="Contraseña actual" name="currentPassword" autoComplete="current-password" required maxLength={200} disabled={pending} /><PasswordField label="Nueva contraseña" name="newPassword" autoComplete="new-password" required minLength={12} maxLength={72} disabled={pending} /><PasswordField label="Repite la nueva contraseña" name="confirmation" autoComplete="new-password" required minLength={12} maxLength={72} disabled={pending} /><p className="calendar-help">Usa al menos 12 caracteres. Al guardar, se cerrarán las sesiones anteriores y podrás entrar con tu nueva contraseña.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar nueva contraseña"}</button></form>;
}
