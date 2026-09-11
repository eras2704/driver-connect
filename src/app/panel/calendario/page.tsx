import { AccountConnection } from "@/components/calendar/account-connection";
import { requireDriver } from "@/lib/driver-session";
import { db } from "@/lib/db";
import { driverFeedUrl } from "@/lib/calendar-access";
import { CalendarSettings } from "@/components/driver/calendar-settings";
export default async function CalendarPage() {
  const actor = await requireDriver(), user = await db().driverUser.findUniqueOrThrow({ where: { id: actor.userId }, select: { id: true, calendarVersion: true, calendarEnabled: true } });
  return <><div className="workspace-heading"><div><span className="eyebrow">SIEMPRE A MANO</span><h1>Tu calendario<span>.</span></h1><p>Cada viaje, también en tu teléfono.</p></div></div><div className="detail-grid"><section className="detail-card"><h2>El calendario de tu teléfono</h2><AccountConnection audience={{ kind: "driver" }} /></section><aside className="detail-card"><h2>También en iPhone</h2><p className="calendar-help">Como alternativa, puedes suscribirte desde Calendario de Apple. Elige una sola forma de conexión para evitar copias.</p><CalendarSettings initialUrl={user.calendarEnabled ? driverFeedUrl(user) : null} /></aside></div></>;
}
