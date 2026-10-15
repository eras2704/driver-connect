export const SERVICE_DAYS = 365;
const DAY = 86_400_000;
export function serviceEnd(start: Date) { return new Date(start.getTime() + SERVICE_DAYS * DAY); }
export function serviceAvailable(service: { serviceStartsAt?: Date | null; serviceExpiresAt?: Date | null }, now = new Date()) {
  // Legacy accounts remain available until an administrator assigns their dates.
  return (!service.serviceStartsAt || service.serviceStartsAt <= now) && (!service.serviceExpiresAt || service.serviceExpiresAt > now);
}
export function renewalEnd(expires: Date | null, now = new Date()) { return serviceEnd(expires && expires > now ? expires : now); }
export function serviceExpiringSoon(expires: Date, now = new Date()) { return expires.getTime() - now.getTime() <= 30 * DAY; }
export function serviceDate(date: Date) { return new Intl.DateTimeFormat("es-PA", { timeZone: "America/Panama", dateStyle: "long" }).format(date); }
