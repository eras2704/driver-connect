import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";
import { servicePhotoUrl } from "../../src/lib/service-photo-url";

if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere una base desechable CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL, origin = process.env.APP_ORIGIN!;

test("fotos de servicios propias, administración y una sola acción de reserva", { timeout: 120_000 }, async () => {
  const suffix = randomBytes(5).toString("hex"), fixtures: { id: string; slug: string; cookie: string }[] = [];
  let adminId: string | undefined, serviceId: string | undefined;
  try {
    const service = await database.service.create({ data: { name: `Servicio CI ${suffix}`, active: true } }); serviceId = service.id;
    const admin = await database.adminUser.create({ data: { username: `ci-service-admin-${suffix}`, name: "Admin CI", passwordHash: "unused-ci-fixture", active: true } }); adminId = admin.id;
    const token = randomBytes(32).toString("hex"), adminCookie = `${SESSION_COOKIE}=${token}`;
    await database.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    for (const label of ["a", "b"]) {
      const slug = `ci-service-${label}-${suffix}`;
      const driver = await database.driver.create({ data: { slug, name: "Conductor CI", whatsapp: "+50760000000", services: { connect: { id: service.id } }, user: { create: { username: slug, passwordHash: "unused-ci-fixture", active: true, mustChangePassword: false } } }, include: { user: true } });
      const driverToken = randomBytes(32).toString("hex");
      await database.driverSession.create({ data: { userId: driver.user!.id, tokenHash: hashToken(`driver:${driverToken}`), expiresAt: new Date(Date.now() + 3600_000) } });
      fixtures.push({ id: driver.id, slug, cookie: `dc_driver_session=${driverToken}` });
    }
    const [a, b] = fixtures;
    const driverPath = `/api/driver/servicios/${service.id}/foto`, adminPath = `/api/admin/conductores/${a.id}/servicios/${service.id}/foto`;
    const bytes = new Uint8Array(await sharp({ create: { width: 120, height: 80, channels: 3, background: "#285c85" } }).jpeg().toBuffer());
    const image = new File([bytes], "servicio.jpg", { type: "image/jpeg" });
    const upload = (path: string, cookie: string, file = image, consent = "yes", requestOrigin = origin) => {
      const form = new FormData(); form.set("file", file); form.set("consent", consent);
      return fetch(`${base}${path}`, { method: "POST", headers: { Origin: requestOrigin, Cookie: cookie }, body: form });
    };
    const remove = (path: string, cookie: string, requestOrigin = origin) => fetch(`${base}${path}`, { method: "DELETE", headers: { Origin: requestOrigin, Cookie: cookie } });
    const media = (key: string, cookie = "") => fetch(`${base}${servicePhotoUrl(key)}`, { headers: { Cookie: cookie } });
    const stored = (driverId: string) => database.driverServicePhoto.findUniqueOrThrow({ where: { driverId_serviceId: { driverId, serviceId: service.id } } });

    assert.equal((await upload(driverPath, "")).status, 401);
    assert.equal((await upload(adminPath, a.cookie)).status, 401);
    assert.equal((await upload(driverPath, a.cookie, image, "yes", "https://wrong.test")).status, 403);
    assert.equal((await upload(adminPath, adminCookie, image, "yes", "https://wrong.test")).status, 403);
    assert.equal((await upload(driverPath, a.cookie, image, "")).status, 400);
    assert.equal((await upload(driverPath, a.cookie, new File(["<svg/>"], "falsa.jpg", { type: "image/jpeg" }))).status, 400);
    assert.equal((await upload("/api/driver/servicios/missing-ci/foto", a.cookie)).status, 404);
    assert.equal(await database.driverServicePhoto.count({ where: { driverId: a.id } }), 0);

    assert.equal((await upload(driverPath, a.cookie)).status, 200);
    const first = await stored(a.id);
    assert.equal((await media(first.storageKey)).status, 404); assert.equal((await media(first.storageKey, b.cookie)).status, 404);
    const ownerImage = await media(first.storageKey, a.cookie); assert.equal(ownerImage.status, 200);
    assert.equal(ownerImage.headers.get("content-type"), "image/webp"); assert.equal(ownerImage.headers.get("cache-control"), "private, no-store");
    assert.equal((await media(first.storageKey, adminCookie)).status, 200);
    assert.equal((await remove(driverPath, b.cookie)).status, 404);
    assert.equal((await remove(adminPath, b.cookie)).status, 401);
    assert.equal((await remove(adminPath, adminCookie, "https://wrong.test")).status, 403);
    assert.equal((await upload(driverPath, b.cookie)).status, 200);
    const other = await stored(b.id); assert.notEqual(other.storageKey, first.storageKey);
    assert.equal((await stored(a.id)).storageKey, first.storageKey);
    assert.equal((await upload(adminPath, adminCookie)).status, 200);
    const second = await stored(a.id); assert.notEqual(second.storageKey, first.storageKey);
    assert.equal((await media(first.storageKey, adminCookie)).status, 404);
    assert.equal(await database.driverServicePhoto.count({ where: { driverId: a.id } }), 1);

    for (const [path, cookie] of [["/panel/perfil", a.cookie], [`/admin/conductores/${a.id}/editar`, adminCookie]]) {
      const response = await fetch(`${base}${path}`, { headers: { Cookie: cookie } }); assert.equal(response.status, 200);
      const html = await response.text(); assert.ok(html.includes(`id="servicePhoto-${service.id}"`));
      assert.ok(html.includes(servicePhotoUrl(second.storageKey)!)); assert.ok(html.includes("Guardar foto del servicio"));
    }
    await database.driver.update({ where: { id: a.id }, data: { active: true } });
    const html = await (await fetch(`${base}/conductor/${a.slug}`)).text();
    assert.ok(html.includes(servicePhotoUrl(second.storageKey)!)); assert.ok(!html.includes(servicePhotoUrl(other.storageKey)!));
    assert.equal((html.match(new RegExp(`href="/conductor/${a.slug}/reservar(?:\\?|\")`, "g")) || []).length, 1);
    assert.doesNotMatch(html, /Solicitar este servicio|Solicitar mi traslado/);
    assert.equal((await fetch(`${base}/conductor/${a.slug}/reservar`)).status, 200);
    assert.equal((await media(second.storageKey)).status, 200);
    await database.driver.update({ where: { id: a.id }, data: { services: { disconnect: { id: service.id } } } });
    assert.equal((await upload(driverPath, a.cookie)).status, 404);
    assert.equal((await media(second.storageKey)).status, 404);
    assert.equal((await media(second.storageKey, a.cookie)).status, 200);
    await database.driver.update({ where: { id: a.id }, data: { services: { connect: { id: service.id } } } });
    await database.service.update({ where: { id: service.id }, data: { active: false } });
    assert.equal((await upload(adminPath, adminCookie)).status, 404); assert.equal((await media(second.storageKey)).status, 404);
    await database.adminUser.update({ where: { id: admin.id }, data: { active: false } });
    assert.equal((await media(second.storageKey, adminCookie)).status, 404); assert.equal((await upload(adminPath, adminCookie)).status, 401);
    await database.adminUser.update({ where: { id: admin.id }, data: { active: true } });
    assert.equal((await remove(adminPath, adminCookie)).status, 200);
    assert.equal((await media(second.storageKey, a.cookie)).status, 404);
    assert.equal((await stored(b.id)).storageKey, other.storageKey);
    assert.equal((await remove(driverPath, b.cookie)).status, 200);
    assert.equal(await database.driverServicePhoto.count({ where: { serviceId: service.id } }), 0);
  } finally {
    for (const driver of fixtures) {
      await database.driverUser.deleteMany({ where: { driverId: driver.id } });
      await database.driver.delete({ where: { id: driver.id } });
    }
    if (serviceId) await database.service.delete({ where: { id: serviceId } });
    if (adminId) await database.adminUser.delete({ where: { id: adminId } });
    await database.$disconnect();
  }
});
