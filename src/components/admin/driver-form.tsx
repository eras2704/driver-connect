"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DriverInput } from "@/lib/validation";
import { VehiclePhotoInput } from "@/components/gallery/vehicle-photo-input";

export function DriverForm({ id, initial, services, mode = "admin", vehicleCoverUrl }: { mode?: "admin" | "driver"; id?: string; initial?: DriverInput; services: { id: string; name: string }[]; vehicleCoverUrl?: string }) {
  const router = useRouter();
  const [vehicleEnabled, setVehicleEnabled] = useState(Boolean(initial?.vehicle));
  const [pending, setPending] = useState(false);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const field = (name: string, label: string, value = "", type = "text", required = false, help?: string, maxLength = 191) => <label key={name} htmlFor={name}>{label}<input id={name} name={name} type={type} defaultValue={value} required={required} maxLength={maxLength} readOnly={name === "slug" && Boolean(id)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : help ? `${name}-help` : undefined} />{help && <small id={`${name}-help`}>{help}</small>}{errors[name] && <small id={`${name}-error`} className="field-error">{errors[name]}</small>}</label>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) || "");
    const payload = {
      name: text("name"), slug: text("slug"), phone: text("phone"), whatsapp: text("whatsapp"), email: text("email"),
      location: text("location"), experience: Number(text("experience")), description: text("description"), photoUrl: text("photoUrl"),
      languages: text("languages").split(",").map((value) => value.trim()).filter(Boolean),
      active: form.get("active") === "on", verified: form.get("verified") === "on", serviceIds: form.getAll("serviceIds"),
      vehicle: vehicleEnabled ? { brand: text("vehicle.brand"), model: text("vehicle.model"), year: Number(text("vehicle.year")), color: text("vehicle.color"), plate: text("vehicle.plate"), passengers: Number(text("vehicle.passengers")), description: text("vehicle.description"), photoUrl: text("vehicle.photoUrl") } : null,
    };
    setPending(true); setError(""); setErrors({});
    try {
      const ownProfile = { name: payload.name, phone: payload.phone, whatsapp: payload.whatsapp, email: payload.email, location: payload.location, experience: payload.experience, description: payload.description, photoUrl: payload.photoUrl, languages: payload.languages, serviceIds: payload.serviceIds, vehicle: payload.vehicle };
      const body = mode === "driver" ? ownProfile : payload;
      const upload = vehicleEnabled && vehiclePhoto ? new FormData() : null;
      if (upload && vehiclePhoto) {
        upload.set("profile", JSON.stringify(body));
        upload.set("vehiclePhoto", vehiclePhoto);
        upload.set("consent", text("vehiclePhotoConsent"));
      }
      const response = await fetch(mode === "driver" ? "/api/driver/perfil" : id ? `/api/admin/conductores/${id}` : "/api/admin/conductores", { method: mode === "driver" || id ? "PATCH" : "POST", ...(upload ? { body: upload } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
      const result = await response.json();
      if (response.status === 401) { setError("Tu sesión venció. Abre tu página de acceso en otra pestaña y vuelve a guardar este formulario."); return; }
      if (!response.ok) { setError(result.error || "No se pudo guardar."); setErrors(result.fields || {}); return; }
      router.push(mode === "driver" ? "/panel/perfil?guardado=1" : `/admin/conductores/${result.id}/editar?guardado=1`); router.refresh();
    } catch { setError("No pudimos conectar. Tus cambios siguen en el formulario; intenta guardar de nuevo."); }
    finally { setPending(false); }
  }

  return <form onSubmit={submit} className="driver-form">
    <section className="admin-card"><span className="eyebrow">01 / PERFIL</span><h2>Datos del conductor</h2><div className="form-grid">
      {field("name", "Nombre público", initial?.name, "text", true)}
      {field("slug", "Dirección del perfil", initial?.slug, "text", true, id ? "Esta dirección permanece fija para conservar tus tarjetas NFC." : "Ejemplo: daniel-rios. No se podrá cambiar después de crear el perfil.", 80)}
      {field("location", "Ciudad o ubicación", initial?.location)}
      {field("experience", "Años de experiencia", String(initial?.experience ?? 0), "number", true)}
      {field("languages", "Idiomas", initial?.languages.join(", ") || "", "text", false, "Separa los idiomas con comas.", 400)}
      {field("photoUrl", "Enlace a la fotografía del conductor", initial?.photoUrl, "url", false, "Opcional. Usa un enlace HTTPS a una imagen que tengas autorización para publicar.", 2048)}
      <label className="full-width" htmlFor="description">Presentación<textarea id="description" name="description" rows={5} maxLength={3000} defaultValue={initial?.description} />{errors.description && <small className="field-error">{errors.description}</small>}</label>
    </div></section>
    <section className="admin-card"><span className="eyebrow">02 / CONTACTO</span><h2>Canales públicos</h2><p className="form-help">Estos datos aparecerán en el perfil al publicarlo. Deja vacíos los canales que no quieras mostrar.</p><div className="form-grid">{field("phone", "Teléfono", initial?.phone, "tel", false, "Incluye el código de país: +507 6000 0000.", 32)}{field("whatsapp", "WhatsApp", initial?.whatsapp, "tel", false, "Incluye el código de país.", 32)}{field("email", "Correo electrónico", initial?.email, "email")}</div></section>
    <section className="admin-card"><span className="eyebrow">03 / SERVICIOS</span><h2>¿Qué ofrece el conductor?</h2><div className="checkbox-grid">{services.map((service) => <label className="checkbox-label" key={service.id}><input type="checkbox" name="serviceIds" value={service.id} defaultChecked={initial?.serviceIds.includes(service.id)} />{service.name}</label>)}</div>{!services.length && <p className="form-help">Todavía no hay servicios disponibles.</p>}</section>
    <section className="admin-card"><span className="eyebrow">04 / VEHÍCULO</span><h2>Vehículo principal</h2><label className="checkbox-label vehicle-toggle"><input type="checkbox" checked={vehicleEnabled} disabled={pending} onChange={(event) => { setVehicleEnabled(event.target.checked); setVehiclePhoto(null); }} />Incluir un vehículo en el perfil</label>{vehicleEnabled && <div className="form-grid">{field("vehicle.brand", "Marca", initial?.vehicle?.brand, "text", true, undefined, 100)}{field("vehicle.model", "Modelo", initial?.vehicle?.model, "text", true, undefined, 100)}{field("vehicle.year", "Año", String(initial?.vehicle?.year || new Date().getFullYear()), "number", true)}{field("vehicle.color", "Color", initial?.vehicle?.color, "text", false, undefined, 64)}{field("vehicle.passengers", "Pasajeros", String(initial?.vehicle?.passengers || 4), "number", true)}{field("vehicle.plate", "Placa", initial?.vehicle?.plate, "text", false, "Sólo visible en administración.", 32)}<input type="hidden" name="vehicle.photoUrl" value={initial?.vehicle?.photoUrl || ""} /><VehiclePhotoInput currentUrl={vehicleCoverUrl || initial?.vehicle?.photoUrl} disabled={pending} error={errors.vehiclePhoto} onChange={setVehiclePhoto} mode={mode} />{field("vehicle.description", "Descripción del vehículo", initial?.vehicle?.description, "text", false, undefined, 1000)}</div>}</section>
    {mode === "admin" && <section className="admin-card"><span className="eyebrow">05 / PUBLICACIÓN</span><h2>Control del perfil</h2><div className="publication-controls"><label className="checkbox-label"><input type="checkbox" name="active" defaultChecked={initial?.active} />Publicar perfil</label><p className="form-help">Al guardar con esta opción activa, el perfil y sus datos de contacto serán visibles para cualquiera con el enlace. Desmárcala para retirarlo de publicación.</p><label className="checkbox-label"><input type="checkbox" name="verified" defaultChecked={initial?.verified} />Conductor verificado por administración</label><p className="form-help">Actívala únicamente después de verificar la información del conductor.</p></div></section>}
    {error && <div className="form-error" role="alert">{error}{Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul>}</div>}
    <div className="form-footer"><Link href={mode === "driver" ? "/panel" : "/admin/conductores"} className="button button-secondary">Volver</Link><button className="button button-primary" type="submit" disabled={pending}>{pending ? vehiclePhoto ? "Guardando perfil y foto…" : "Guardando…" : id ? "Guardar cambios" : "Crear conductor"}</button></div>
  </form>;
}
