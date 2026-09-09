import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDatabase } from "../../src/lib/database";
import { localDateTime } from "../../src/lib/calendar";
const adminUsername = process.env.ADMIN_USERNAME || "", adminPassword = process.env.ADMIN_PASSWORD || "";
if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !adminUsername.startsWith("ci-") || !adminPassword || !process.env.TEST_BASE_URL) throw new Error("Las pruebas de agenda requieren una base desechable de CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL!, origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
const get = (path: string, cookie = "") => fetch(`${base}${path}`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
const send = (path: string, body: unknown, cookie = "", method = "POST", requestOrigin: string | null = origin) => fetch(`${base}${path}`, { method, redirect: "manual", headers: { "Content-Type": "application/json", ...(requestOrigin ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
function cookieFrom(response: Response) { const header = response.headers.get("set-cookie"); assert.ok(header); assert.match(header, /HttpOnly/i); return header.split(";")[0]; }
async function enter(username: string, password: string, role = "driver") { const response = await send(`/api/${role}/login`, { username, password }); assert.equal(response.status, 200); return cookieFrom(response); }
const fromPublicUrl = (url: string) => new URL(url).pathname;

test("reservas, permisos de conductor y calendarios sin descarga de archivos", { timeout: 180_000 }, async t => {
  const suffix = randomBytes(5).toString("hex"), temporary = randomBytes(24).toString("hex"), personal = randomBytes(24).toString("hex");
  const adminCookie = await enter(adminUsername, adminPassword, "admin");
  const drivers: { id: string; slug: string; username: string; cookie: string }[] = [];
  let bookingId = "", passengerPage = "", passengerFeed = "", feedUrl = "";
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 20); date.setUTCHours(15, 0, 0, 0);
  const dateAt = (hours: number) => localDateTime(new Date(date.getTime() + hours * 3600_000));
  const data = { customerName: `PRIVATE-CUSTOMER-${suffix}`, phone: "+50760000000", email: "private@example.test", pickup: `Hotel ${suffix}`, destination: "Aeropuerto de Tocumen", startsAt: dateAt(0), passengers: 2, notes: `PRIVATE-NOTE-${suffix}` };
  const request = { ...data, serviceId: "airport", requestId: randomUUID(), consent: true, website: "" };
  const manual = { ...data, serviceName: "Traslado CI", duration: 60 };
  try {
    for (const label of ["a", "b"]) {
      const slug = `ci-agenda-${label}-${suffix}`, username = `ci-driver-${label}-${suffix}`;
      const created = await send("/api/admin/conductores", { name: `Conductor ${label} ${suffix}`, slug, phone: "+50760000111", whatsapp: "+50760000111", email: "", location: "Panamá", experience: 7, languages: ["Español"], description: "Perfil de prueba", photoUrl: "", active: true, verified: true, serviceIds: ["airport"], vehicle: null }, adminCookie);
      assert.equal(created.status, 201); const id: string = (await created.json()).id;
      drivers.push({ id, slug, username, cookie: "" });
      assert.equal((await send(`/api/admin/conductores/${id}/acceso`, { username, password: temporary, active: true }, adminCookie)).status, 200);
    }
    const [a, b] = drivers;
    await t.test("el acceso temporal obliga a elegir contraseña y mantiene separados los roles", async () => {
      assert.equal((await get("/api/driver/agenda")).status, 401);
      assert.equal((await get("/panel")).headers.get("location"), "/login-conductor");
      assert.equal((await get("/api/driver/agenda", adminCookie)).status, 401);
      for (const driver of drivers) {
        const initialCookie = await enter(driver.username, temporary);
        assert.equal((await get("/api/driver/agenda", initialCookie)).status, 403);
        assert.equal((await send("/api/driver/seguridad", { currentPassword: temporary, newPassword: personal, confirmation: personal }, initialCookie, "POST", null)).status, 403);
        assert.equal((await send("/api/driver/seguridad", { currentPassword: temporary, newPassword: personal, confirmation: personal }, initialCookie)).status, 200);
        assert.equal((await get("/api/driver/agenda", initialCookie)).status, 401);
        driver.cookie = await enter(driver.username, personal);
        assert.equal((await get("/api/driver/agenda", driver.cookie)).status, 200);
        assert.equal((await get("/api/admin/conductores", driver.cookie)).status, 401);
      }
      assert.equal((await get("/panel/agenda", a.cookie)).status, 200);
      assert.equal((await get("/panel/perfil", a.cookie)).status, 200);
      assert.equal((await get("/panel/calendario", a.cookie)).status, 200);
    });
    await t.test("el conductor puede editar su perfil sin cambiar publicación, verificación ni identidad", async () => {
      const profile = { name: `Conductor a ${suffix}`, phone: "+50760000111", whatsapp: "+50760000111", email: "", location: "Panamá", experience: 8, languages: ["Español"], description: "Perfil actualizado", photoUrl: "", serviceIds: ["airport"], vehicle: null };
      for (const extra of [{ active: false }, { verified: false }, { slug: b.slug }, { driverId: b.id }]) assert.equal((await send("/api/driver/perfil", { ...profile, ...extra }, a.cookie, "PATCH")).status, 400);
      assert.equal((await send("/api/driver/perfil", profile, a.cookie, "PATCH")).status, 200);
      const saved = await database.driver.findUniqueOrThrow({ where: { id: a.id } }); assert.equal(saved.active, true); assert.equal(saved.verified, true); assert.equal(saved.experience, 8);
      assert.equal((await database.driver.findUniqueOrThrow({ where: { id: b.id } })).experience, 7);
    });
    await t.test("solicita traslado con consentimiento, valida datos y evita duplicados", async () => {
      const path = `/api/reservas/${a.slug}`;
      assert.equal((await send(path, request, "", "POST", null)).status, 403);
      for (const extra of [{ consent: false }, { website: "spam" }, { phone: "60000000" }, { startsAt: "2026-02-30T10:00" }, { status: "CONFIRMED" }]) assert.equal((await send(path, { ...request, ...extra })).status, 400);
      assert.equal((await send(path, { ...request, serviceId: "city" })).status, 404);
      assert.equal((await get(`/conductor/${a.slug}/reservar?servicio=Traslados%20al%20aeropuerto`)).status, 200);
      const created = await send(path, request); assert.equal(created.status, 201); passengerPage = (await created.json()).path;
      const repeated = await send(path, request); assert.equal(repeated.status, 201); assert.equal((await repeated.json()).path, passengerPage);
      assert.equal((await send(path, { ...request, pickup: "Changed" })).status, 409);
      assert.equal(await database.booking.count({ where: { driverId: a.id } }), 1);
      const booking = await database.booking.findFirstOrThrow({ where: { driverId: a.id } }); bookingId = booking.id; assert.equal(booking.status, "PENDING");
      assert.equal(booking.endsAt.getTime() - booking.startsAt.getTime(), 3600_000);
      passengerFeed = passengerPage.replace("/reserva/", "/calendario/reserva/");
      assert.ok(!(await (await get(passengerFeed)).text()).includes("BEGIN:VEVENT"));
      const page = await get(passengerPage); assert.equal(page.status, 200); const html = await page.text(); assert.ok(!html.includes("calendar.google.com/calendar/render"));
      for (const secret of [data.notes, data.phone, data.email, data.customerName]) assert.ok(!html.includes(secret));
      assert.equal((await get(passengerFeed.slice(0, -1) + "z")).status, 404);
    });
    await t.test("rechaza acceso cruzado a viajes y mutaciones sin un origen válido", async () => {
      const bTrips = await (await get("/api/driver/agenda", b.cookie)).json(); assert.equal(bTrips.trips.length, 0);
      assert.equal((await send(`/api/driver/agenda/${bookingId}`, { status: "CONFIRMED", version: 0 }, b.cookie, "PATCH")).status, 404);
      assert.equal((await send(`/api/driver/agenda/${bookingId}`, { ...manual, version: 0 }, b.cookie, "PUT")).status, 404);
      assert.equal((await send(`/api/driver/agenda/${bookingId}`, { status: "CONFIRMED", version: 0 }, a.cookie, "PATCH", "https://attacker.test")).status, 403);
      assert.ok(!(await (await get(`/panel/agenda/${bookingId}`, b.cookie)).text()).includes(data.customerName));
    });
    await t.test("confirma el viaje y ofrece Google Calendar y suscripción privada", async () => {
      assert.equal((await send(`/api/driver/agenda/${bookingId}`, { status: "CONFIRMED", version: 0 }, a.cookie, "PATCH")).status, 200);
      const publicView = await (await get(passengerPage)).text(); assert.ok(publicView.includes("calendar.google.com/calendar/render"));
      assert.ok(publicView.includes("referrer"));
      const response = await get(passengerFeed); assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") || "", /text\/calendar/); assert.equal(response.headers.get("content-disposition"), null);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const feed = await response.text(); assert.ok(feed.includes(`UID:${bookingId}@driver-connect`)); assert.ok(feed.includes("SEQUENCE:1")); assert.ok(feed.includes("STATUS:CONFIRMED"));
      for (const secret of [data.customerName, data.phone, data.email, data.notes]) assert.ok(!feed.includes(secret));
      const ownPage = await get(`/panel/agenda/${bookingId}`, a.cookie); assert.equal(ownPage.status, 200); assert.ok((await ownPage.text()).includes(data.notes));
    });
    await t.test("evita cruces de horario, permite intervalos contiguos y confirma de forma atómica", async () => {
      assert.equal((await send("/api/driver/agenda", manual, a.cookie)).status, 409);
      assert.equal((await send("/api/driver/agenda", { ...manual, startsAt: dateAt(1) }, a.cookie)).status, 201);
      const competing = await send(`/api/reservas/${a.slug}`, { ...request, requestId: randomUUID() }); assert.equal(competing.status, 201);
      const other = await database.booking.findFirstOrThrow({ where: { driverId: a.id, status: "PENDING" } });
      assert.equal((await send(`/api/driver/agenda/${other.id}`, { status: "CONFIRMED", version: 0 }, a.cookie, "PATCH")).status, 409);
      const simultaneous = await Promise.all([send("/api/driver/agenda", { ...manual, startsAt: dateAt(5) }, a.cookie), send("/api/driver/agenda", { ...manual, startsAt: dateAt(5) }, a.cookie)]);
      assert.deepEqual(simultaneous.map(r => r.status).sort(), [201, 409]);
      assert.equal(await database.booking.count({ where: { driverId: a.id, startsAt: new Date(date.getTime() + 5 * 3600_000), status: "CONFIRMED" } }), 1);
      assert.equal((await send("/api/driver/agenda", { ...manual, pickup: `ONLY-B-${suffix}` }, b.cookie)).status, 201);
    });
    await t.test("editar preserva el UID, incrementa versión y detecta formularios desactualizados", async () => {
      const path = `/api/driver/agenda/${bookingId}`;
      assert.equal((await send(path, { ...manual, startsAt: dateAt(3), version: 0 }, a.cookie, "PUT")).status, 409);
      assert.equal((await send(path, { ...manual, startsAt: dateAt(3), version: 1 }, a.cookie, "PUT")).status, 200);
      const feed = await (await get(passengerFeed)).text(); assert.ok(feed.includes(`UID:${bookingId}@driver-connect`)); assert.ok(feed.includes("SEQUENCE:2"));
      assert.equal((await send(path, { status: "CANCELLED", version: 1 }, a.cookie, "PATCH")).status, 409);
    });
    await t.test("el calendario del conductor se limita a su agenda y permite revocar sus enlaces", async () => {
      assert.equal((await send("/api/driver/calendario", { action: "enable" }, a.cookie, "POST", null)).status, 403);
      const enabled = await send("/api/driver/calendario", { action: "enable" }, a.cookie); assert.equal(enabled.status, 200); feedUrl = (await enabled.json()).url;
      const feed = await (await get(fromPublicUrl(feedUrl))).text(); assert.ok(feed.includes(`UID:${bookingId}@driver-connect`)); assert.ok(!feed.includes(`ONLY-B-${suffix}`));
      assert.ok(!feed.includes(data.notes));
      const rotated = await send("/api/driver/calendario", { action: "rotate" }, a.cookie); assert.equal(rotated.status, 200); const nextUrl = (await rotated.json()).url;
      assert.notEqual(nextUrl, feedUrl); assert.equal((await get(fromPublicUrl(feedUrl))).status, 404); feedUrl = nextUrl;
      assert.equal((await get(fromPublicUrl(feedUrl))).status, 200);
      assert.equal((await send("/api/driver/calendario", { action: "disable" }, a.cookie)).status, 200);
      assert.equal((await get(fromPublicUrl(feedUrl))).status, 404);
      feedUrl = (await (await send("/api/driver/calendario", { action: "enable" }, a.cookie)).json()).url;
    });
    await t.test("cancelar se refleja en la suscripción y cierra el viaje", async () => {
      assert.equal((await send(`/api/driver/agenda/${bookingId}`, { status: "CANCELLED", version: 2 }, a.cookie, "PATCH")).status, 200);
      const feed = await (await get(passengerFeed)).text(); assert.ok(feed.includes("STATUS:CANCELLED")); assert.ok(feed.includes("SEQUENCE:3")); assert.ok(feed.includes(`UID:${bookingId}@driver-connect`));
      assert.ok(!(await (await get(passengerPage)).text()).includes("calendar.google.com/calendar/render"));
      assert.equal((await send(`/api/driver/agenda/${bookingId}`, { status: "CONFIRMED", version: 3 }, a.cookie, "PATCH")).status, 409);
    });
    await t.test("el conductor puede invalidar el enlace privado de un pasajero", async () => {
      assert.equal((await send(`/api/driver/agenda/${bookingId}/enlace`, {}, b.cookie)).status, 404);
      const response = await send(`/api/driver/agenda/${bookingId}/enlace`, {}, a.cookie); assert.equal(response.status, 200);
      assert.equal((await get(passengerFeed)).status, 404);
      const next = (await response.json()).path; assert.notEqual(next, passengerPage);
      assert.ok(!(await (await get(passengerPage)).text()).includes(data.pickup));
      passengerPage = next; passengerFeed = next.replace("/reserva/", "/calendario/reserva/");
      assert.equal((await get(passengerFeed)).status, 200);
    });
    await t.test("limita solicitudes de forma persistente por teléfono y rechaza perfiles sin acceso", async () => {
      assert.equal((await send(`/api/reservas/${a.slug}`, { ...request, requestId: randomUUID() })).status, 201);
      assert.equal((await send(`/api/reservas/${a.slug}`, { ...request, requestId: randomUUID() })).status, 429);
      assert.ok(await database.requestLimit.findFirst({ where: { key: { startsWith: "booking:" }, attempts: { gte: 4 } } }));
      assert.equal((await send(`/api/admin/conductores/${b.id}/acceso`, { active: false }, adminCookie, "PATCH")).status, 200);
      assert.equal((await get("/api/driver/agenda", b.cookie)).status, 401);
      assert.equal((await send(`/api/reservas/${b.slug}`, { ...request, requestId: randomUUID() })).status, 404);
    });
    await t.test("restablecer acceso revoca sesiones y suscripciones, y exige otra contraseña personal", async () => {
      assert.equal((await send(`/api/admin/conductores/${a.id}/acceso`, { username: a.username, password: temporary, active: true }, adminCookie)).status, 200);
      assert.equal((await get("/api/driver/agenda", a.cookie)).status, 401);
      assert.equal((await get(fromPublicUrl(feedUrl))).status, 404);
      const newCookie = await enter(a.username, temporary);
      assert.equal((await get("/api/driver/agenda", newCookie)).status, 403);
    });
  } finally {
    for (const driver of drivers) {
      await database.booking.deleteMany({ where: { driverId: driver.id } });
      await database.driverUser.deleteMany({ where: { driverId: driver.id } });
      await database.vehicle.deleteMany({ where: { driverId: driver.id } });
      await database.driver.delete({ where: { id: driver.id } });
    }
    await database.$disconnect();
  }
});
