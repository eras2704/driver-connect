"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ProfilePhotoInput } from "./profile-photo-input";

type Service = { id: string; name: string; photoUrl: string | null };
function ServicePhotoCard({ service, driverId }: { service: Service; driverId?: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const inputName = `servicePhoto-${service.id}`;
  const endpoint = driverId ? `/api/admin/conductores/${encodeURIComponent(driverId)}/servicios/${encodeURIComponent(service.id)}/foto` : `/api/driver/servicios/${encodeURIComponent(service.id)}/foto`;
  async function change(method: "POST" | "DELETE", body?: FormData) {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method, ...(body ? { body } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la foto del servicio.");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Comprueba tu conexión e inténtalo de nuevo."); }
    finally { setBusy(false); }
  }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file || busy) return;
    const fields = new FormData(event.currentTarget), body = new FormData();
    body.set("file", file); body.set("consent", String(fields.get(`${inputName}Consent`) || ""));
    void change("POST", body);
  }
  return <article className="admin-card service-photo-card"><h3>{service.name}</h3>
    <form className="booking-form" onSubmit={upload}>
      <ProfilePhotoInput kind="service" inputName={inputName} currentUrl={service.photoUrl || undefined} disabled={busy} onChange={setFile} mode={driverId ? "admin" : "driver"} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="detail-actions"><button className="button button-primary" type="submit" disabled={busy || !file}>{busy ? "Guardando…" : "Guardar foto del servicio"}</button>
        {service.photoUrl && <button className="button button-secondary" type="button" disabled={busy || Boolean(file)} onClick={() => { if (window.confirm(`¿Quitar la foto de ${service.name}?`)) void change("DELETE"); }}>Quitar foto</button>}
      </div>
    </form>
  </article>;
}

export function ServicePhotoManager({ services, driverId }: { services: Service[]; driverId?: string }) {
  return <section className="driver-form service-photo-manager" id="fotos-servicios" aria-labelledby="service-photos-heading">
    <div><span className="eyebrow">SERVICIOS EN IMÁGENES</span><h2 id="service-photos-heading">Fotos de los servicios</h2><p className="form-help">Añade una imagen a cada servicio. Guarda primero los cambios del perfil si acabas de activar un servicio nuevo.</p></div>
    {services.length ? <div className="service-photo-grid">{services.map(service => <ServicePhotoCard key={`${service.id}:${service.photoUrl || "empty"}`} service={service} driverId={driverId} />)}</div> : <p className="form-help">Selecciona los servicios del conductor y guarda el perfil para añadir sus fotos.</p>}
  </section>;
}
