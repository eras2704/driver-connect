import { appleSubscriptionUrl, googleEventUrl, type CalendarTrip } from "@/lib/calendar";
import { Icon } from "../icon";
export function CalendarActions({ trip, feedUrl }: { trip: CalendarTrip; feedUrl: string }) {
  const apple = appleSubscriptionUrl(feedUrl);
  if (trip.status !== "CONFIRMED") return <p className="calendar-help">El calendario se habilita cuando el viaje está confirmado. Si ya estabas suscrito y se canceló, Calendario mostrará la cancelación cuando se actualice.</p>;
  return <><div className="calendar-options"><a className="button button-primary" href={googleEventUrl(trip)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" />Añadir a Google Calendar ↗</a>{apple ? <a className="button button-secondary" href={apple}><Icon name="calendar" />Añadir a Calendario de iPhone</a> : <span className="calendar-help">La conexión con Calendario de iPhone estará disponible cuando el sitio tenga una dirección HTTPS pública.</span>}</div><p className="calendar-help">Sin descargar archivos. Google abre el evento para revisarlo y guardarlo; esa copia se actualiza manualmente. iPhone pide confirmar una suscripción y recibe los cambios cuando sincroniza.</p></>;
}
