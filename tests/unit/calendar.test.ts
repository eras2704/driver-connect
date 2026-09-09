import assert from "node:assert/strict";
import test from "node:test";
import { appleSubscriptionUrl, calendarFeed, calendarText, googleEventUrl, localDateTime, monthRange, parsePanamaDate, type CalendarTrip } from "../../src/lib/calendar";
import { driverProfileSchema, manualBookingSchema, requestBookingSchema } from "../../src/lib/booking-validation";
const trip: CalendarTrip = { id: "stable-trip", serviceName: "Traslado; aeropuerto", pickup: "Hotel, Panamá", destination: "Tocumen", startsAt: parsePanamaDate("2026-10-12T08:30"), endsAt: parsePanamaDate("2026-10-12T09:30"), status: "CONFIRMED", version: 2, updatedAt: new Date("2026-09-09T12:00:00Z") };
test("las fechas de Panamá se validan sin desplazamientos ni fechas imposibles", () => {
  assert.equal(trip.startsAt.toISOString(), "2026-10-12T13:30:00.000Z");
  assert.equal(localDateTime(trip.startsAt), "2026-10-12T08:30");
  for (const value of ["2026-02-30T08:00", "2026-10-12T24:00", "2026-10-12T08:60", "2026-10-12", "invalid"]) assert.throws(() => parsePanamaDate(value));
  assert.equal(monthRange("2026-12").next, "2027-01");
  assert.equal(monthRange("2026-01").previous, "2025-12");
  assert.equal(monthRange("2028-02").end.getTime() - monthRange("2028-02").start.getTime(), 29 * 86400_000);
});
test("Google recibe un formulario de evento y Apple una suscripción HTTPS sin descarga manual", () => {
  const google = new URL(googleEventUrl(trip));
  assert.equal(google.origin, "https://calendar.google.com");
  assert.equal(google.searchParams.get("action"), "TEMPLATE");
  assert.equal(google.searchParams.get("dates"), "20261012T133000Z/20261012T143000Z");
  assert.equal(google.searchParams.get("ctz"), "America/Panama");
  assert.equal(google.searchParams.get("location"), trip.pickup);
  assert.equal(appleSubscriptionUrl("https://example.test/calendario/secret"), "webcal://example.test/calendario/secret");
  assert.equal(appleSubscriptionUrl("http://127.0.0.1:3000/calendario/secret"), null);
});
test("la suscripción conserva UID, versiona cambios y comunica cancelaciones sin datos privados", () => {
  const extra = { ...trip, customerName: "PRIVATE CUSTOMER", phone: "PRIVATE PHONE", notes: "PRIVATE NOTE", email: "PRIVATE EMAIL" };
  const feed = calendarFeed([extra], "Mi agenda");
  assert.ok(feed.includes("UID:stable-trip@driver-connect"));
  assert.ok(feed.includes("SEQUENCE:2")); assert.ok(feed.includes("STATUS:CONFIRMED"));
  for (const value of [extra.customerName, extra.phone, extra.notes, extra.email]) assert.ok(!feed.includes(value));
  const cancellation = calendarFeed([{ ...trip, status: "CANCELLED", version: 3 }], "Mi agenda");
  assert.ok(cancellation.includes("UID:stable-trip@driver-connect")); assert.ok(cancellation.includes("SEQUENCE:3")); assert.ok(cancellation.includes("STATUS:CANCELLED"));
  assert.ok(!calendarFeed([{ ...trip, status: "PENDING" }], "Mi agenda").includes("BEGIN:VEVENT"));
});
test("iCalendar escapa inyecciones y pliega líneas a 75 octetos sin cortar Unicode", () => {
  const value = "á🚘".repeat(80) + "\r\nBEGIN:VEVENT\nATTENDEE:evil@example.test";
  const feed = calendarFeed([{ ...trip, pickup: value }], "Calendario; seguro");
  assert.equal(feed.match(/^BEGIN:VEVENT/gm)?.length, 1);
  for (const line of feed.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(feed.replace(/\r\n /g, "").includes(`LOCATION:${calendarText(value)}`));
  assert.ok(!feed.includes("\r\nATTENDEE:evil"));
});
test("reservas y edición de perfil rechazan cambios de privilegios y entradas incompletas", () => {
  const data = { customerName: "Cliente", phone: "+507 6000 0000", pickup: "Hotel", destination: "Aeropuerto", startsAt: "2026-10-12T08:30", passengers: 2, email: "", notes: "" };
  const request = { ...data, serviceId: "airport", requestId: "61925036-37fc-4756-9374-05c6eb170aac", consent: true, website: "" };
  assert.equal(requestBookingSchema.safeParse(request).success, true);
  for (const extra of [{ consent: false }, { website: "spam" }, { driverId: "other" }, { status: "CONFIRMED" }, { duration: 240 }, { startsAt: "2026-02-30T08:00" }, { phone: "60000000" }, { passengers: 0 }]) assert.equal(requestBookingSchema.safeParse({ ...request, ...extra }).success, false);
  assert.equal(manualBookingSchema.safeParse({ ...data, serviceName: "Servicio", duration: 60 }).success, true);
  assert.equal(manualBookingSchema.safeParse({ ...data, serviceName: "Servicio", duration: 0 }).success, false);
  const ownProfile = { name: "Driver", phone: "", whatsapp: "", email: "", location: "", experience: 1, languages: [], description: "", photoUrl: "", serviceIds: [], vehicle: null };
  assert.equal(driverProfileSchema.safeParse(ownProfile).success, true);
  for (const extra of [{ active: true }, { verified: true }, { slug: "other" }, { id: "other" }]) assert.equal(driverProfileSchema.safeParse({ ...ownProfile, ...extra }).success, false);
});
