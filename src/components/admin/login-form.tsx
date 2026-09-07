"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error); return; }
      router.replace("/admin"); router.refresh();
    } catch { setError("No pudimos conectar. Inténtalo de nuevo."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="admin-form">
    <label htmlFor="username">Usuario<input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} /></label>
    <label htmlFor="password">Contraseña<input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button button-primary" disabled={pending}>{pending ? "Entrando…" : "Entrar a administración"}</button>
  </form>;
}
