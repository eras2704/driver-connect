"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div><button className="admin-logout" disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try { const response = await fetch("/api/admin/logout", { method: "POST" }); if (!response.ok) throw new Error(); router.replace("/login-admin"); router.refresh(); }
    catch { setError("No se pudo cerrar la sesión. Intenta de nuevo."); }
    finally { setPending(false); }
  }}>{pending ? "Cerrando…" : "Cerrar sesión"}</button>{error && <p role="alert" className="form-error">{error}</p>}</div>;
}
