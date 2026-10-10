import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";
import { localDateTime } from "../../src/lib/calendar";

if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere una base desechable CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL!, origin = process.env.APP_ORIGIN!;

test("cambiar direcciones conserva QR, enlaces anteriores y propiedad exclusiva", { timeout: 120_000 }, async () => {
  const suffix = randomBytes(5).toString("hex"), slug = `ci-address-${suffix}`;
  const ids: string[] = [];
  let adminId: string | undefined;
  try {
    const admin = await database.adminUser.create({ data: { username: `ci-address-admin-${suffix}`, name: "Admin CI", passwordHash: "unused-ci-fixture", active: true } });
    adminId = admin.id;
    const token = randomBytes(32).toString("hex"), cookie = `${SESSION_COOKIE}=${token}`;
    await database.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const profile = { name: "Conductor de prueba", slug, active: true, verified: false, experience: 3, languages: [], serviceIds: ["airport"], vehicle: null };
    const send = (path: string, data: unknown, method = "POST") => fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: JSON.stringify(data) });
    const create = async (address: string) => {
      const response = await send("/api/admin/conductores", { ...profile, slug: address });
      assert.equal(response.status, 201);
      const { id } = await response.json(); ids.push(id); return id as string;
    };
    const id = await create(slug), other = await create(`${slug}-other`);
    await database.driverUser.create({ data: { driverId: id, username: `ci-address-driver-${suffix}`, passwordHash: "unused-ci-fixture", active: true, mustChangePassword: false } });
    const editor = async () => (await fetch(`${base}/admin/conductores/${id}/editar`, { headers: { Cookie: cookie } })).text();
    const originalQr = (await editor()).match(/src="(data:image\/png;base64,[^"]+)"/)?.[1];
    assert.ok(originalQr);
    const first = `${slug}-changed`, second = `${slug}-again`;
    for (const address of [first, second]) {
      assert.equal((await send(`/api/admin/conductores/${id}`, { ...profile, slug: address, name: "Nombre actualizado" }, "PATCH")).status, 200);
      assert.equal((await database.driver.findUniqueOrThrow({ where: { id } })).qrSlug, slug);
      assert.equal((await editor()).match(/src="(data:image\/png;base64,[^"]+)"/)?.[1], originalQr);
    }
    const request = { customerName: "Cliente CI", phone: "+50760000000", email: "", pickup: "Hotel", destination: "Aeropuerto", passengers: 1, startsAt: localDateTime(new Date(Date.now() + 20 * 86400_000)), serviceId: "airport", requestId: randomUUID(), consent: true };
    let passengerPath: string | undefined;
    for (const address of [slug, first, second]) {
      const page = await fetch(`${base}/conductor/${address}`);
      assert.equal(page.status, 200); assert.match(await page.text(), /Nombre actualizado/);
      const contact = await fetch(`${base}/conductor/${address}/contacto`);
      assert.equal(contact.status, 200); assert.ok((await contact.text()).includes(`/conductor/${second}`));
      assert.equal((await fetch(`${base}/conductor/${address}/reservar`)).status, 200);
      const booking = await send(`/api/reservas/${address}`, request);
      assert.equal(booking.status, 201);
      const result = await booking.json();
      passengerPath ??= result.path;
      assert.equal(result.path, passengerPath);
      assert.equal((await send("/api/admin/conductores", { ...profile, slug: address })).status, 409);
      assert.equal((await send(`/api/admin/conductores/${other}`, { ...profile, slug: address }, "PATCH")).status, 409);
    }
    // Invalid services must roll back the new address and all other profile changes.
    const unused = `${slug}-rollback`;
    assert.equal((await send(`/api/admin/conductores/${id}`, { ...profile, slug: unused, serviceIds: ["missing-service"] }, "PATCH")).status, 400);
    assert.equal(await database.driverAddress.findUnique({ where: { slug: unused } }), null);
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id } })).slug, second);
    // Historical addresses are reusable by their owner, never by another profile.
    assert.equal((await send(`/api/admin/conductores/${id}`, { ...profile, active: false }, "PATCH")).status, 200);
    for (const address of [slug, first, second]) {
      assert.equal((await fetch(`${base}/conductor/${address}/contacto`)).status, 404);
      assert.equal((await send(`/api/reservas/${address}`, request)).status, 404);
      assert.ok(!(await (await fetch(`${base}/conductor/${address}`)).text()).includes(profile.name));
    }
    // Fixtures or imports without qrSlug must also preserve their first address.
    const legacySlug = `${slug}-legacy`;
    const legacy = await database.driver.create({ data: { slug: legacySlug, name: "Perfil anterior", active: true } });
    ids.push(legacy.id);
    assert.equal((await send(`/api/admin/conductores/${legacy.id}`, { ...profile, slug: `${legacySlug}-new` }, "PATCH")).status, 200);
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id: legacy.id } })).qrSlug, legacySlug);
    assert.equal((await database.driverAddress.findUniqueOrThrow({ where: { slug: legacySlug } })).driverId, legacy.id);
    assert.equal((await fetch(`${base}/conductor/${legacySlug}/contacto`)).status, 200);
  } finally {
    await database.booking.deleteMany({ where: { driverId: { in: ids } } });
    await database.driverUser.deleteMany({ where: { driverId: { in: ids } } });
    await database.driver.deleteMany({ where: { id: { in: ids } } });
    if (adminId) await database.adminUser.delete({ where: { id: adminId } });
    await database.$disconnect();
  }
});
