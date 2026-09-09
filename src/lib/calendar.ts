export const TIME_ZONE = "America/Panama";
export const statusLabels = { PENDING: "Pendiente", CONFIRMED: "Confirmado", REJECTED: "Rechazado", CANCELLED: "Cancelado" } as const;
export type TripStatus = keyof typeof statusLabels;
export function localDateTime(date: Date) { return new Date(date.getTime() - 5 * 3600_000).toISOString().slice(0, 16); }
export function parsePanamaDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Fecha inválida.");
  const date = new Date(`${value}:00-05:00`);
  if (!Number.isFinite(date.getTime()) || localDateTime(date) !== value) throw new Error("Fecha inválida.");
  return date;
}
export function formatTripDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-PA", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}
export function monthRange(value?: string) {
  const month = typeof value === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value) ? value : localDateTime(new Date()).slice(0, 7);
  const start = parsePanamaDate(`${month}-01T00:00`);
  const next = new Date(start); next.setUTCMonth(next.getUTCMonth() + 1);
  const previous = new Date(start); previous.setUTCMonth(previous.getUTCMonth() - 1);
  return { month, start, end: next, previous: localDateTime(previous).slice(0, 7), next: localDateTime(next).slice(0, 7) };
}
export type CalendarTrip = { id: string; serviceName: string; pickup: string; destination: string; startsAt: Date; endsAt: Date; status: TripStatus; version: number; updatedAt: Date };
export function calendarText(value: string) { return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ""); }
function fold(value: string) {
  let out = "", length = 0;
  for (const char of value) { const bytes = Buffer.byteLength(char); if (length + bytes > 75) { out += "\r\n "; length = 1; } out += char; length += bytes; }
  return out;
}
export function calendarStamp(date: Date) { return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
export function calendarFeed(trips: CalendarTrip[], name: string) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Driver Connect//Agenda//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${calendarText(name)}`, `X-WR-TIMEZONE:${TIME_ZONE}`, "REFRESH-INTERVAL;VALUE=DURATION:PT15M", "X-PUBLISHED-TTL:PT15M"];
  for (const trip of trips) {
    if (trip.status === "PENDING") continue;
    lines.push("BEGIN:VEVENT", `UID:${trip.id}@driver-connect`, `DTSTAMP:${calendarStamp(trip.updatedAt)}`, `LAST-MODIFIED:${calendarStamp(trip.updatedAt)}`, `SEQUENCE:${trip.version}`, `DTSTART:${calendarStamp(trip.startsAt)}`, `DTEND:${calendarStamp(trip.endsAt)}`, `SUMMARY:${calendarText(trip.serviceName)}`, `LOCATION:${calendarText(trip.pickup)}`, `DESCRIPTION:${calendarText(`Recogida: ${trip.pickup}\nDestino: ${trip.destination}\nGestiona los cambios en Driver Connect.`)}`, `STATUS:${trip.status === "CONFIRMED" ? "CONFIRMED" : "CANCELLED"}`, "END:VEVENT");
  }
  return [...lines, "END:VCALENDAR", ""].map(fold).join("\r\n");
}
export function googleEventUrl(trip: Pick<CalendarTrip, "serviceName" | "pickup" | "destination" | "startsAt" | "endsAt">) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.search = new URLSearchParams({ action: "TEMPLATE", text: trip.serviceName, dates: `${calendarStamp(trip.startsAt)}/${calendarStamp(trip.endsAt)}`, ctz: TIME_ZONE, location: trip.pickup, details: `Recogida: ${trip.pickup}\nDestino: ${trip.destination}\nEsta copia no se actualiza automáticamente. Consulta los cambios en Driver Connect.` }).toString();
  return url.href;
}
export function appleSubscriptionUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") return null;
  return `webcal://${parsed.host}${parsed.pathname}${parsed.search}`;
}
