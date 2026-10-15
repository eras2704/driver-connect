import { currentDriver } from "@/lib/driver-session";
import { redirect } from "next/navigation";
import { serviceAvailable, serviceDate } from "@/lib/subscription";
export const dynamic = "force-dynamic";
export default async function ExpiredPage() {
  const actor = await currentDriver();
  if (!actor) redirect("/login-conductor");
  if (serviceAvailable(actor)) redirect("/panel");
  return <main className="private-booking"><section className="detail-card"><h1>Tu servicio requiere renovación</h1><p>{actor.serviceExpiresAt && actor.serviceExpiresAt <= new Date() ? `Tu servicio venció el ${serviceDate(actor.serviceExpiresAt)}.` : "Tu servicio todavía no ha comenzado."}</p><p>Contacta a la administración para confirmar el pago y renovar tu servicio por 365 días. Tu perfil, tus viajes y tu QR se conservan.</p><a className="button button-primary" href="/panel">Consultar activación</a></section></main>;
}
