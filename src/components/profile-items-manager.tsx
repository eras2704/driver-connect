"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "./icon";
import { ProfilePhotoInput } from "./gallery/profile-photo-input";
type Item = { id: string; updatedAt: string; photoSrc?: string; photoUrl?: string | null; name?: string; nameEn?: string | null; brand?: string; model?: string; year?: number; color?: string | null; colorEn?: string | null; plate?: string | null; passengers?: number; description?: string | null; descriptionEn?: string | null };
export function ProfileItemsManager({ kind, items, driverId, legacy = false }: { kind: "vehicles" | "services"; items: Item[]; driverId?: string; legacy?: boolean }) {
  const router = useRouter(), [editing, setEditing] = useState<Item | null | undefined>(), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [photo, setPhoto] = useState<File | null>(null);
  const vehicles = kind === "vehicles", limit = vehicles ? 10 : 5, noun = vehicles ? "vehículo" : "servicio";
  const endpoint = `${driverId ? `/api/admin/conductores/${driverId}` : "/api/driver"}/${vehicles ? "vehiculos" : "prestaciones"}`;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const form = new FormData(event.currentTarget), value = (key: string) => String(form.get(key) || "");
    const fields = vehicles ? { brand: value("brand"), model: value("model"), year: Number(value("year")), color: value("color"), colorEn: value("colorEn"), plate: value("plate"), passengers: Number(value("passengers")), description: value("description"), descriptionEn: value("descriptionEn"), photoUrl: editing?.photoUrl || "" } : { name: value("name"), nameEn: value("nameEn"), description: value("description"), descriptionEn: value("descriptionEn") };
    const payload = { ...fields, ...(editing ? { id: editing.id, updatedAt: editing.updatedAt } : {}) };
    const upload = photo ? new FormData() : null;
    if (upload && photo) { upload.set("profile", JSON.stringify(payload)); upload.set("vehiclePhoto", photo); upload.set("consent", value(`${kind}PhotoConsent`)); }
    setBusy(true); setMessage("");
    try { const response = await fetch(endpoint, { method: "POST", ...(upload ? { body: upload } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }) }); const data = await response.json(); if (!response.ok) { setMessage(data.error || "No se pudo guardar."); return; } setEditing(undefined); setPhoto(null); setMessage("Guardado correctamente."); router.refresh(); }
    catch { setMessage("No se pudo confirmar el guardado. Recarga antes de volver a agregar el mismo registro."); } finally { setBusy(false); }
  }
  async function remove(item: Item) {
    if (!window.confirm(`¿Retirar este ${noun} del perfil?`)) return;
    setBusy(true); setMessage("");
    try { const response = await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, updatedAt: item.updatedAt }) }); const data = await response.json(); if (!response.ok) { setMessage(data.error || "No se pudo retirar."); return; } setMessage("Retirado del perfil."); if (editing?.id === item.id) { setEditing(undefined); setPhoto(null); } router.refresh(); } catch { setMessage("No se pudo completar la operación."); } finally { setBusy(false); }
  }
  const input = (key: string, label: string, type = "text", required = false, defaultValue?: string | number | null) => <label key={key}>{label}<input name={key} type={type} required={required} defaultValue={defaultValue ?? ""} maxLength={key === "description" ? 1000 : 191} {...(type === "number" ? { min: key === "year" ? 1980 : 1, max: key === "year" ? new Date().getFullYear() + 1 : 50 } : {})} /></label>;
  function openEditor(item: Item | null) {
    setEditing(item); setPhoto(null); setMessage("");
  }
  const editorId = `${kind}-editor`;
  const editorHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (editing !== undefined) editorHeading.current?.focus();
  }, [editing]);
  return <section className="admin-card profile-collection" id={vehicles ? "mis-vehiculos" : "mis-servicios"} aria-busy={busy}>
    <header className="collection-heading">
      <span className="collection-symbol"><Icon name={vehicles ? "car" : "briefcase"} /></span>
      <div><h2>{vehicles ? "Mis vehículos" : "Mis servicios"}</h2>
        <p>{vehicles ? "Cada carro, con su propia presentación. El primero es el principal." : "Presenta lo que haces con un nombre, una descripción y una buena foto."}</p></div>
      <span className="collection-count">{items.length} de {limit}</span>
    </header>
    {legacy && !vehicles && <p className="collection-note">Al agregar tu primer servicio propio, reemplazarás el catálogo anterior en tu perfil. Tus viajes anteriores se conservan.</p>}
    {items.length > 0 ? <ul className="collection-list">{items.map((item, index) => {
      const title = vehicles ? `${item.brand} ${item.model}` : item.name;
      return <li key={item.id} className={editing?.id === item.id ? "collection-item is-editing" : "collection-item"}>
        <div className="collection-thumbnail">{item.photoSrc
          ? <Image src={item.photoSrc} alt={`Foto de ${title}`} width={176} height={132} unoptimized referrerPolicy="no-referrer" />
          : <Icon name={vehicles ? "car" : "briefcase"} />}</div>
        <div className="collection-copy">
          <span className="collection-kicker">{vehicles ? index === 0 ? "Vehículo principal" : `Vehículo ${index + 1}` : `Servicio ${String(index + 1).padStart(2, "0")}`}</span>
          <h3>{title}</h3><p>{vehicles ? `${item.year} · ${item.passengers} pasajeros` : item.description || "Añade una descripción para presentar este servicio."}</p>
        </div>
        <div className="collection-actions">
          <button type="button" className="button button-secondary" disabled={busy} aria-label={`Editar ${title}`} aria-controls={editorId} aria-expanded={editing?.id === item.id} onClick={() => openEditor(item)}><Icon name="edit" />Editar</button>
          <button type="button" className="collection-remove" disabled={busy} aria-label={`Retirar ${title}`} onClick={() => void remove(item)}><Icon name="trash" /><span>Retirar</span></button>
        </div>
      </li>;
    })}</ul> : <div className="collection-empty"><Icon name={vehicles ? "car" : "briefcase"} /><h3>{vehicles ? "Tu flota comienza aquí" : "Dale tu sello a cada servicio"}</h3><p>{vehicles ? "Agrega tu primer vehículo y muestra cómo viajarán tus pasajeros." : "Agrega hasta cinco servicios que tus pasajeros puedan reservar."}</p></div>}
    {editing === undefined ? <footer className="collection-footer"><button type="button" className="button button-secondary" disabled={busy || items.length >= limit} aria-controls={editorId} onClick={() => openEditor(null)}><Icon name="plus" />Agregar {noun}</button><small>{items.length >= limit ? `Has completado tus ${limit} ${vehicles ? "vehículos" : "servicios"}. Puedes editarlos cuando quieras.` : `${limit - items.length} ${limit - items.length === 1 ? "espacio disponible" : "espacios disponibles"}`}</small></footer>
      : <form className="profile-item-editor" id={editorId} key={editing?.id || "new"} onSubmit={save}>
        <header><span className="collection-kicker">{editing ? "Cuida los detalles" : "Una nueva presentación"}</span><h3 ref={editorHeading} tabIndex={-1}>{editing ? "Editar" : "Nuevo"} {noun}</h3></header>
        <fieldset disabled={busy} className="form-grid">
          <legend className="sr-only">Datos del {noun}</legend>
          {vehicles ? <>{input("brand", "Marca", "text", true, editing?.brand)}{input("model", "Modelo", "text", true, editing?.model)}{input("year", "Año", "number", true, editing?.year || new Date().getFullYear())}{input("color", "Color", "text", false, editing?.color)}{input("passengers", "Pasajeros", "number", true, editing?.passengers || 4)}{input("plate", "Placa (privada)", "text", false, editing?.plate)}</> : <div className="full-width">{input("name", "Nombre del servicio", "text", true, editing?.name)}</div>}
          <label className="full-width">Descripción<textarea name="description" rows={3} maxLength={1000} placeholder={vehicles ? "Comodidad, equipamiento y detalles del vehículo…" : "Cuenta brevemente qué incluye este servicio…"} defaultValue={editing?.description || ""} /><small>Hasta 1,000 caracteres.</small></label>
          <details className="collection-translations full-width"><summary><Icon name="globe" />Versión en inglés <span>Opcional</span></summary><div className="form-grid">{vehicles ? input("colorEn", "Color en inglés", "text", false, editing?.colorEn) : input("nameEn", "Nombre en inglés", "text", false, editing?.nameEn)}<label className="full-width">Descripción en inglés<textarea name="descriptionEn" rows={3} maxLength={1000} defaultValue={editing?.descriptionEn || ""} /></label></div></details>
          <ProfilePhotoInput kind={vehicles ? "vehicle" : "service"} inputName={`${kind}Photo`} currentUrl={editing?.photoSrc} disabled={busy} onChange={setPhoto} mode={driverId ? "admin" : "driver"} standaloneVehicle={vehicles} />
        </fieldset>
        <div className="collection-editor-actions"><button className="button button-primary" disabled={busy}><Icon name="check" />{busy ? "Guardando…" : "Guardar cambios"}</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => { setEditing(undefined); setPhoto(null); }}>Cancelar</button></div>
      </form>}
    {message && <p className="collection-feedback" role="status">{message}</p>}
  </section>;
}
