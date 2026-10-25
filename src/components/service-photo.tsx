"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { AutoFitPhoto } from "./auto-fit-photo";
import { translatePublic, type PublicLanguage } from "@/lib/public-locale";

export function ServicePhoto({ src, name, language }: { src: string; name: string; language: PublicLanguage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const t = (es: string, en: string) => translatePublic(language, es, en);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function resize(value: number) {
    setZoom(Math.max(1, Math.min(4, value)));
    if (value === 1) viewport.current?.scrollTo({ top: 0, left: 0 });
  }

  return <>
    <button type="button" className="service-photo-trigger" aria-haspopup="dialog" aria-label={`${t("Ampliar imagen", "Expand image")}: ${name}`} onClick={() => {
      setZoom(1);
      dialog.current?.showModal();
      viewport.current?.scrollTo({ top: 0, left: 0 });
      setOpen(true);
    }}>
      <AutoFitPhoto className="reference-service-image" src={src} alt={name} sizes="(max-width: 600px) 50vw, 40vw" />
      <span className="service-photo-hint" aria-hidden="true">⤢ {t("Ampliar imagen", "Expand image")}</span>
    </button>
    <dialog ref={dialog} className="service-photo-dialog" aria-labelledby={titleId} onClose={() => { setOpen(false); setZoom(1); }} onClick={event => {
      if (event.target === event.currentTarget) {
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.current?.close();
      }
    }}>
      {open && <>
        <header className="service-photo-toolbar">
          <h2 id={titleId}>{name}</h2>
          <button type="button" className="button button-secondary" autoFocus onClick={() => dialog.current?.close()} aria-label={t("Cerrar imagen", "Close image")}>× <span>{t("Cerrar", "Close")}</span></button>
        </header>
        <div className="service-photo-viewport" ref={viewport} tabIndex={0} aria-label={t("Imagen ampliada; desplázate para leer los detalles", "Expanded image; scroll to read the details")}>
          <div className="service-photo-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            <Image src={src} alt={name} fill sizes="100vw" unoptimized referrerPolicy="no-referrer" draggable={false} />
          </div>
        </div>
        <footer className="service-photo-controls">
          <button type="button" className="button button-secondary" disabled={zoom === 1} onClick={() => resize(zoom - .5)} aria-label={t("Alejar imagen", "Zoom out")}>−</button>
          <output aria-live="polite">{Math.round(zoom * 100)}%</output>
          <button type="button" className="button button-secondary" disabled={zoom === 4} onClick={() => resize(zoom + .5)} aria-label={t("Acercar imagen", "Zoom in")}>+</button>
          <button type="button" className="button button-secondary" onClick={() => resize(1)}>{t("Ajustar a pantalla", "Fit to screen")}</button>
        </footer>
      </>}
    </dialog>
  </>;
}
