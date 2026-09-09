import Link from "next/link";
import { requireDriver } from "@/lib/driver-session";
import { db } from "@/lib/db";
import { driverFeedUrl } from "@/lib/calendar-access";
import { CalendarSettings } from "@/components/driver/calendar-settings";
export default async function CalendarPage() {
  const actor = await requireDriver(), user = await db().driverUser.findUniqueOrThrow({ where: { id: actor.userId }, select: { id: true, calendarVersion: true, calendarEnabled: true } });
  return <><div className="workspace-heading"><div><span className="eyebrow">SIEMPRE A MANO</span><h1>Tu calendario<span>.</span></h1><p>Cada viaje, también en tu teléfono.</p></div></div><div className="detail-grid"><section className="detail-card"><h2>Calendario de iPhone</h2><CalendarSettings initialUrl={user.calendarEnabled ? driverFeedUrl(user) : null} /></section><aside className="detail-card"><h2>Google Calendar</h2><p>Abre cualquier viaje confirmado y pulsa «Añadir a Google Calendar». Podrás revisar y guardar el evento directamente, desde Android, iPhone o tu navegador.</p><p className="calendar-help">No requiere descargar archivos. Es una copia del viaje: si cambias la fecha o cancelas, actualiza también esa copia. La suscripción de iPhone sí consulta los cambios.</p><Link className="text-link" href="/panel/agenda">Ir a mis viajes →</Link></aside></div></>;
}
