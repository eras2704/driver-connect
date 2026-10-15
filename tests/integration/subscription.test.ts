import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";
import { serviceEnd } from "../../src/lib/subscription";
if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere una base desechable CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL!, origin = process.env.APP_ORIGIN!;
test("vigencia, suspensión, renovación idempotente y QR permanente", { timeout: 120_000 }, async () => {
  const suffix = randomBytes(5).toString("hex"), slug = `ci-service-${suffix}`;
  let adminId: string | undefined, driverId: string | undefined;
  try {
    const admin = await database.adminUser.create({ data: { username: `ci-service-admin-${suffix}`, name: "Admin CI", passwordHash: "unused", active: true } }); adminId = admin.id;
    const token = randomBytes(32).toString("hex"), cookie = `${SESSION_COOKIE}=${token}`;
    await database.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const driver = await database.driver.create({ data: { slug, qrSlug: slug, name: "Servicio CI", active: true, addresses: { create: { slug } } } }); driverId = driver.id;
    const path = `/api/admin/conductores/${driver.id}/suscripcion`;
    const send = (body: unknown, authorized = true, requestOrigin = origin) => fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: requestOrigin, ...(authorized ? { Cookie: cookie } : {}) }, body: JSON.stringify(body), redirect: "manual" });
    const dates = { action: "dates", requestId: randomUUID(), startsAt: "2020-01-01", reference: "Fecha original" };
    assert.equal((await fetch(`${base}/conductor/${slug}`)).status, 200);
    assert.equal((await send(dates, false)).status, 401);
    assert.equal((await send(dates, true, "https://invalid.example")).status, 403);
    assert.equal((await send(dates)).status, 200);
    assert.equal((await fetch(`${base}/conductor/${slug}`)).status, 404);
    assert.equal((await fetch(`${base}/conductor/${slug}/contacto`)).status, 404);
    const driverToken = randomBytes(32).toString("hex");
    const user = await database.driverUser.create({ data: { driverId: driver.id, username: `ci-service-driver-${suffix}`, passwordHash: "unused", active: true, mustChangePassword: false } });
    await database.driverSession.create({ data: { userId: user.id, tokenHash: hashToken(`driver:${driverToken}`), expiresAt: new Date(Date.now() + 3600_000) } });
    const headers = { Cookie: `dc_driver_session=${driverToken}` };
    assert.equal((await fetch(`${base}/panel`, { headers, redirect: "manual" })).headers.get("location"), "/servicio-vencido");
    assert.equal((await fetch(`${base}/api/calendarios`, { method: "POST", headers: { ...headers, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", audience: { kind: "driver" } }) })).status, 403);
    const renewal = { action: "renew", requestId: randomUUID(), reference: "Pago CI 1", paymentConfirmed: true };
    assert.equal((await send({ ...renewal, paymentConfirmed: false })).status, 400);
    const before = Date.now();
    const results = await Promise.all([send(renewal), send(renewal)]);
    assert.deepEqual(results.map(r => r.status), [200, 200]);
    let updated = await database.driver.findUniqueOrThrow({ where: { id: driver.id } });
    assert.ok(updated.serviceExpiresAt!.getTime() >= before + 365 * 86400_000);
    assert.equal(updated.qrSlug, slug); assert.equal(updated.slug, slug);
    assert.equal(await database.servicePeriod.count({ where: { driverId: driver.id, action: "renew" } }), 1);
    assert.equal((await send({ ...renewal, requestId: randomUUID() })).status, 409);
    assert.equal((await fetch(`${base}/conductor/${slug}`)).status, 200);
    assert.equal((await fetch(`${base}/panel`, { headers, redirect: "manual" })).status, 200);
    const expires = updated.serviceExpiresAt!;
    assert.equal((await send({ ...renewal, requestId: randomUUID(), reference: "Pago CI 2" })).status, 200);
    updated = await database.driver.findUniqueOrThrow({ where: { id: driver.id } });
    assert.equal(updated.serviceExpiresAt!.getTime(), serviceEnd(expires).getTime());
    assert.equal((await send({ ...dates, requestId: randomUUID(), startsAt: "2026-02-30" })).status, 400);
  } finally {
    if (driverId) { await database.driverUser.deleteMany({ where: { driverId } }); await database.driver.delete({ where: { id: driverId } }); }
    if (adminId) await database.adminUser.delete({ where: { id: adminId } });
    await database.$disconnect();
  }
});
