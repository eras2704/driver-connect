import Image from "next/image";
import { authConfiguration } from "@/lib/security";
import { profileQr } from "@/lib/profile-qr";
import { ShareProfile } from "./share-profile";

export async function ProfileQrCard({ slug, qrSlug = slug, name, published }: { slug: string; qrSlug?: string; name: string; published: boolean }) {
  const origin = authConfiguration().origin;
  const qr = await profileQr(origin, qrSlug);
  return <section className="detail-card profile-qr-card" aria-label={`QR de ${name}`}>
    <div className="profile-qr-preview"><Image src={qr.png} width={240} height={240} unoptimized alt={`Código QR para abrir el perfil de ${name}`} /></div>
    <div className="profile-qr-content">
      <span className="eyebrow">TU TARJETA NFC</span>
      <h2>QR de {name}</h2>
      <p>Tu QR conserva su enlace aunque administración cambie la dirección del perfil. Las tarjetas ya entregadas siguen funcionando.</p>
      {slug !== qrSlug && <p>Dirección actual: <a href={`/conductor/${slug}`}>{`${origin}/conductor/${slug}`}</a></p>}
      {!published && <p className="form-success" role="status">Perfil en borrador: el QR ya está listo, pero el enlace funcionará cuando se publique el perfil.</p>}
      <label className="profile-qr-url">Enlace para grabar en la tarjeta NFC<input readOnly value={qr.url} aria-label="Enlace para la tarjeta NFC" /></label>
      <div className="detail-actions">
        <a className="button button-primary" href={qr.svg} download={`qr-${qrSlug}.svg`}>Descargar SVG para imprimir</a>
        <a className="button button-secondary" href={qr.png} download={`qr-${qrSlug}.png`}>Descargar PNG</a>
        <ShareProfile path={`/conductor/${slug}`} title={`${name} · Driver Connect`} />
      </div>
      <p className="calendar-help">Imprime el QR de al menos 3 × 3 cm, conserva el borde blanco y prueba el escaneo antes de pegarlo. Graba este mismo enlace en el chip NFC.</p>
    </div>
  </section>;
}
