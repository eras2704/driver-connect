"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function VehiclePhotoInput({ currentUrl, disabled, error, onChange, mode = "driver" }: {
  currentUrl?: string;
  disabled: boolean;
  error?: string;
  onChange: (file: File | null) => void;
  mode?: "admin" | "driver";
}) {
  const input = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [selection, setSelection] = useState<{ name: string; preview: string | null } | null>(null);
  const [fileError, setFileError] = useState("");

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function select(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    const message = file && file.size > 8 * 1024 * 1024 ? "La foto debe pesar menos de 8 MB." : "";
    input.current?.setCustomValidity(message);
    setFileError(message);
    if (file && !message) previewRef.current = URL.createObjectURL(file);
    setSelection(file ? { name: file.name, preview: previewRef.current } : null);
    onChange(file);
  }

  const preview = selection?.preview || currentUrl;
  return <div className="vehicle-photo-input full-width">
    <label htmlFor="vehiclePhoto">Fotografía del vehículo
      <input ref={input} id="vehiclePhoto" name="vehiclePhoto" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
        aria-invalid={Boolean(fileError || error)} aria-describedby="vehicle-photo-help vehicle-photo-error"
        onChange={event => select(event.currentTarget.files?.[0] || null)} />
      <small id="vehicle-photo-help">Selecciona una foto de tu celular o computadora. JPG, PNG o WebP, hasta 8 MB. Al guardar será la foto principal y se añadirá {mode === "admin" ? "a la galería del conductor" : "a Mis fotos"}.</small>
    </label>
    {preview && <figure className="vehicle-photo-preview">
      <Image src={preview} alt={selection?.preview ? "Vista previa de la nueva foto del vehículo" : "Foto actual del vehículo"} width={800} height={500} unoptimized referrerPolicy="no-referrer" />
      <figcaption>{selection?.preview ? selection.name : "Foto actual"}</figcaption>
    </figure>}
    {selection && <>
      <button type="button" className="text-link" disabled={disabled} onClick={() => { if (input.current) input.current.value = ""; select(null); }}>Cancelar selección</button>
      <label className="checkbox-label"><input name="vehiclePhotoConsent" type="checkbox" value="yes" required disabled={disabled} />Tengo permiso para publicar esta foto y, si aparecen personas, cuento con su autorización.</label>
      <small>La nueva foto será visible cuando {mode === "admin" ? "el perfil del conductor esté publicado. Las anteriores se conservan en su galería." : "tu perfil esté publicado. Las anteriores se conservan en Mis fotos."}</small>
    </>}
    <small id="vehicle-photo-error" className="field-error" role={fileError || error ? "alert" : undefined}>{fileError || error}</small>
  </div>;
}
