import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { createDatabase } from "../../src/lib/database";
import { hashToken } from "../../src/lib/security";
import { digest, decrypt, encrypt } from "../../src/lib/cloud-calendar/crypto";
import { syncNext } from "../../src/lib/cloud-calendar/worker";
import { CalendarError } from "../../src/lib/cloud-calendar/providers";
import { queueBooking } from "../../src/lib/cloud-calendar/queue";
if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL || !process.env.CALENDAR_TOKEN_KEY) throw new Error("Requiere base desechable CI y clave de prueba.");
const database = createDatabase(), base = process.env.TEST_BASE_URL, origin = process.env.APP_ORIGIN!;
const send = (path: string, body: object, cookie = "", method = "POST", requestOrigin = origin) => fetch(`${base}${path}`, { method, redirect: "manual", headers: { "Content-Type": "application/json", Origin: requestOrigin, Cookie: cookie }, body: JSON.stringify(body) });
test("fotos privadas por propietario, OAuth ligado al navegador y cola durable", { timeout: 120_000 }, async t => {
  const suffix = randomBytes(5).toString("hex"), fixtures: { id: string; userId: string; cookie: string }[] = [];
  try {
    for (const label of ["a", "b"]) {
      const driver = await database.driver.create({ data: { slug: `ci-new-${label}-${suffix}`, name: "Prueba", active: true, user: { create: { username: `ci-new-${label}-${suffix}`, passwordHash: "unused-ci-fixture", active: true, mustChangePassword: false } } }, include: { user: true } });
      const token = randomBytes(32).toString("hex"); await database.driverSession.create({ data: { userId: driver.user!.id, tokenHash: hashToken(`driver:${token}`), expiresAt: new Date(Date.now() + 3600_000) } }); fixtures.push({ id: driver.id, userId: driver.user!.id, cookie: `dc_driver_session=${token}` });
    }
    const [a, b] = fixtures;
    await t.test("subida, perfil público, edición, orden, borrado y permisos", async () => {
      const bytes = await sharp({ create: { width: 120, height: 80, channels: 3, background: "blue" } }).jpeg().toBuffer();
      async function upload(cookie: string, requestOrigin = origin) { const form = new FormData(); form.set("file", new File([new Uint8Array(bytes)], "car.jpg", { type: "image/jpeg" })); form.set("caption", "Vehículo de prueba"); form.set("category", "VEHICLE"); form.set("consent", "yes"); return fetch(`${base}/api/driver/fotos`, { method: "POST", headers: { Origin: requestOrigin, Cookie: cookie }, body: form }); }
      assert.equal((await upload("")).status, 401); assert.equal((await upload(a.cookie, "https://wrong.test")).status, 403);
      const response = await upload(a.cookie); assert.equal(response.status, 201); const { id } = await response.json();
      const image = await fetch(`${base}/media/${id}`); assert.equal(image.status, 200); assert.match(image.headers.get("content-type")!, /image\/webp/);
      assert.equal((await send(`/api/driver/fotos/${id}`, { action: "edit", caption: "No", category: "TRIP" }, b.cookie, "PATCH")).status, 404);
      assert.equal((await send(`/api/driver/fotos/${id}`, { action: "edit", caption: "Interior", category: "VEHICLE" }, a.cookie, "PATCH")).status, 200);
      assert.equal((await send(`/api/driver/fotos/${id}`, { action: "move", direction: "up" }, a.cookie, "PATCH")).status, 200);
      assert.equal((await fetch(`${base}/panel/fotos`, { headers: { Cookie: a.cookie } })).status, 200);
      await database.driver.update({ where: { id: a.id }, data: { active: false } });
      assert.equal((await fetch(`${base}/media/${id}`)).status, 404); assert.equal((await fetch(`${base}/media/${id}`, { headers: { Cookie: a.cookie } })).status, 200); assert.equal((await fetch(`${base}/media/${id}`, { headers: { Cookie: b.cookie } })).status, 404);
      await database.driver.update({ where: { id: a.id }, data: { active: true } });
      assert.equal((await send(`/api/driver/fotos/${id}`, {}, b.cookie, "DELETE")).status, 404); assert.equal((await send(`/api/driver/fotos/${id}`, {}, a.cookie, "DELETE")).status, 200); assert.equal((await fetch(`${base}/media/${id}`)).status, 404);
    });
    const trip = await database.booking.create({ data: { driverId: a.id, serviceName: "CI traslado", customerName: "PRIVATE", phone: "+50760000000", pickup: "Hotel", destination: "Aeropuerto", startsAt: new Date(Date.now() + 86400_000), endsAt: new Date(Date.now() + 90000_000), status: "CONFIRMED", wasConfirmed: true } });
    await t.test("OAuth exige origen, sesión y el mismo navegador; un estado se consume una vez", async () => {
      const input = { action: "connect", audience: { kind: "driver" }, provider: "GOOGLE" };
      assert.equal((await send("/api/calendarios", input)).status, 401); assert.equal((await send("/api/calendarios", input, a.cookie, "POST", "https://wrong.test")).status, 403);
      const response = await send("/api/calendarios", input, a.cookie); assert.equal(response.status, 200); const { url } = await response.json(), authorize = new URL(url), state = authorize.searchParams.get("state")!;
      assert.equal(authorize.origin, "https://accounts.google.com"); assert.equal(authorize.searchParams.get("code_challenge_method"), "S256"); assert.ok(!url.includes(a.id));
      const stored = await database.calendarOAuthState.findUniqueOrThrow({ where: { stateHash: digest(state) } }); assert.notEqual(stored.verifier, decrypt(stored.verifier, stored.stateHash));
      const binding = response.headers.getSetCookie().map(v => v.split(";")[0]).join("; "), callback = `${base}/api/calendarios/callback/google?state=${encodeURIComponent(state)}&error=access_denied`;
      await fetch(callback, { redirect: "manual", headers: { Cookie: a.cookie } }); assert.ok(await database.calendarOAuthState.findUnique({ where: { stateHash: digest(state) } }));
      const result = await fetch(callback, { redirect: "manual", headers: { Cookie: `${a.cookie}; ${binding}` } }); assert.match(result.headers.get("location")!, /cancelado/); assert.equal(await database.calendarOAuthState.findUnique({ where: { stateHash: digest(state) } }), null);
      const repeat = await fetch(callback, { redirect: "manual", headers: { Cookie: `${a.cookie}; ${binding}` } }); assert.match(repeat.headers.get("location")!, /error/);
    });
    const connection = await database.calendarConnection.create({ data: { ownerKey: `driver:${a.userId}`, ownerVersion: 0, provider: "GOOGLE", accountHash: digest(suffix), accountLabel: "CI calendar", driverUserId: a.userId, nextSyncAt: new Date() } });
    await database.calendarConnection.update({ where: { id: connection.id }, data: { refreshToken: encrypt("fake-refresh", connection.id) } });
    await t.test("cola sincroniza, evita duplicados, preserva cambios concurrentes y aplica cancelaciones", async () => {
      let writes = 0; const seen: string[] = [];
      const transport = { refresh: async () => ({ accessToken: "fake-access", refreshToken: "rotated-refresh" }), writeEvent: async (_provider: unknown, _token: string, booking: { status: string }, map: { operationId: string }) => { writes++; seen.push(booking.status); return map.operationId; } };
      await Promise.all([syncNext(database, transport), syncNext(database, transport)]); assert.equal(writes, 1);
      assert.equal(decrypt((await database.calendarConnection.findUniqueOrThrow({ where: { id: connection.id } })).refreshToken!, connection.id), "rotated-refresh");
      await database.$transaction(async tx => { await tx.booking.update({ where: { id: trip.id }, data: { version: { increment: 1 }, destination: "Otro destino" } }); await queueBooking(tx, trip); });
      const concurrent = { ...transport, writeEvent: async (...args: Parameters<typeof transport.writeEvent>) => { await database.$transaction(async tx => { await tx.booking.update({ where: { id: trip.id }, data: { version: { increment: 1 }, status: "CANCELLED" } }); await queueBooking(tx, trip); }); return transport.writeEvent(...args); } };
      await syncNext(database, concurrent); const queued = await database.calendarConnection.findUniqueOrThrow({ where: { id: connection.id } }); assert.ok(queued.nextSyncAt! <= new Date());
      await syncNext(database, transport); assert.deepEqual(seen, ["CONFIRMED", "CONFIRMED", "CANCELLED"]); assert.equal(await database.calendarEvent.count({ where: { connectionId: connection.id } }), 1);
      await database.calendarConnection.update({ where: { id: connection.id }, data: { nextSyncAt: new Date() } });
      await syncNext(database, { ...transport, refresh: async () => { throw new CalendarError("REAUTH"); } });
      const revoked = await database.calendarConnection.findUniqueOrThrow({ where: { id: connection.id } }); assert.equal(revoked.status, "REAUTH"); assert.equal(revoked.refreshToken, null);
      assert.equal((await send("/api/calendarios", { action: "disconnect", audience: { kind: "driver" }, connectionId: connection.id }, b.cookie)).status, 404);
      assert.equal((await send("/api/calendarios", { action: "disconnect", audience: { kind: "driver" }, connectionId: connection.id }, a.cookie)).status, 200);
    });
  } finally {
    for (const driver of fixtures) { await database.calendarOAuthState.deleteMany({ where: { driverUserId: driver.userId } }); await database.booking.deleteMany({ where: { driverId: driver.id } }); await database.driverUser.deleteMany({ where: { driverId: driver.id } }); await database.driver.delete({ where: { id: driver.id } }); }
    await database.$disconnect();
  }
});
