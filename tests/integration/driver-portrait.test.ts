import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";
import { portraitUrl } from "../../src/lib/portrait-url";

if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere una base desechable CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL, origin = process.env.APP_ORIGIN!;

test("foto personal en ambos paneles, carga conjunta, reemplazo y privacidad", { timeout: 120_000 }, async t => {
  const suffix = randomBytes(5).toString("hex"), newSlug = `ci-portrait-new-${suffix}`;
  const fixtures: { id: string; slug: string; cookie: string }[] = [];
  let adminId: string | undefined;
  try {
    const admin = await database.adminUser.create({ data: { username: `ci-portrait-admin-${suffix}`, name: "Admin CI", passwordHash: "unused-ci-fixture", active: true } });
    adminId = admin.id;
    const token = randomBytes(32).toString("hex"), adminCookie = `${SESSION_COOKIE}=${token}`;
    await database.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    for (const label of ["a", "b"]) {
      const driver = await database.driver.create({ data: { slug: `ci-portrait-${label}-${suffix}`, name: "Conductor original", photoUrl: "https://example.test/original.jpg", user: { create: { username: `ci-portrait-${label}-${suffix}`, passwordHash: "unused-ci-fixture", active: true, mustChangePassword: false } } }, include: { user: true } });
      const driverToken = randomBytes(32).toString("hex");
      await database.driverSession.create({ data: { userId: driver.user!.id, tokenHash: hashToken(`driver:${driverToken}`), expiresAt: new Date(Date.now() + 3600_000) } });
      fixtures.push({ id: driver.id, slug: driver.slug, cookie: `dc_driver_session=${driverToken}` });
    }
    const [a, b] = fixtures;
    const bytes = new Uint8Array(await sharp({ create: { width: 120, height: 80, channels: 3, background: "#285c85" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer());
    const photo = new File([bytes], "retrato.jpg", { type: "image/jpeg" });
    const invalid = new File(["<svg/>"], "falsa.jpg", { type: "image/jpeg" });
    const profile = { name: "Conductor actualizado", experience: 5, languages: ["Español"], serviceIds: [] as string[], photoUrl: "https://example.test/original.jpg", vehicle: null };
    const car = { brand: "Toyota", model: "Prado", year: 2024, passengers: 4, photoUrl: "" };
    const upload = (path: string, body: object, cookie: string, portrait: File = photo, vehicle?: File, consent = "yes", requestOrigin = origin, method = "PATCH") => {
      const form = new FormData(); form.set("profile", JSON.stringify(body)); form.set("driverPhoto", portrait); form.set("driverConsent", consent);
      if (vehicle) { form.set("vehiclePhoto", vehicle); form.set("consent", "yes"); }
      return fetch(`${base}${path}`, { method, headers: { Cookie: cookie, Origin: requestOrigin }, body: form });
    };
    const save = (path: string, body: object, cookie: string) => fetch(`${base}${path}`, { method: "PATCH", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const media = (key: string, cookie = "") => fetch(`${base}${portraitUrl(key)}`, { headers: { Cookie: cookie } });
    const stored = () => database.driver.findUniqueOrThrow({ where: { id: a.id } });

    await t.test("administración puede crear el conductor con ambas imágenes", async () => {
      const body = { ...profile, slug: newSlug, active: false, verified: false, vehicle: car };
      const created = await upload("/api/admin/conductores", body, adminCookie, photo, photo, "yes", origin, "POST");
      assert.equal(created.status, 201);
      const { id } = await created.json();
      const driver = await database.driver.findUniqueOrThrow({ where: { id } }); assert.ok(driver.portraitStorageKey);
      assert.equal(await database.driverPhoto.count({ where: { driverId: id } }), 1);
      assert.equal((await media(driver.portraitStorageKey)).status, 404);
      assert.equal((await media(driver.portraitStorageKey, adminCookie)).status, 200);
      assert.equal((await upload("/api/admin/conductores", body, adminCookie, photo, photo, "yes", origin, "POST")).status, 409);
      assert.equal((await database.driver.findUniqueOrThrow({ where: { id } })).portraitStorageKey, driver.portraitStorageKey);
    });

    for (const role of ["driver", "admin"] as const) await t.test(`guardar y cambiar el retrato desde ${role}`, async () => {
      const path = role === "driver" ? "/api/driver/perfil" : `/api/admin/conductores/${a.id}`;
      const body = role === "driver" ? profile : { ...profile, slug: a.slug, active: false, verified: false };
      const cookie = role === "driver" ? a.cookie : adminCookie;
      await database.driver.update({ where: { id: a.id }, data: { active: false } });
      const previous = (await stored()).portraitStorageKey;
      assert.equal((await upload(path, body, "")).status, 401);
      assert.equal((await upload(path, body, cookie, photo, undefined, "yes", "https://wrong.test")).status, 403);
      if (role === "admin") assert.equal((await upload(path, body, a.cookie)).status, 401);
      const noConsent = await upload(path, body, cookie, photo, undefined, ""); assert.equal(noConsent.status, 400);
      assert.ok((await noConsent.json()).fields.driverPhoto);
      const badImage = await upload(path, body, cookie, invalid); assert.equal(badImage.status, 400);
      assert.ok((await badImage.json()).fields.driverPhoto);
      assert.equal((await upload(path, { ...body, vehicle: car }, cookie, photo, invalid)).status, 400);
      assert.equal((await upload(path, { ...body, name: "No guardar", serviceIds: ["missing-ci-service"] }, cookie)).status, 400);
      assert.equal((await stored()).portraitStorageKey, previous);
      assert.equal((await upload(path, body, cookie)).status, 200);
      const first = (await stored()).portraitStorageKey!; assert.ok(first); assert.notEqual(first, previous);
      if (previous) assert.equal((await media(previous, adminCookie)).status, 404);
      assert.equal((await media(first)).status, 404); assert.equal((await media(first, b.cookie)).status, 404);
      const image = await media(first, a.cookie); assert.equal(image.status, 200); assert.equal(image.headers.get("cache-control"), "private, no-store");
      const meta = await sharp(new Uint8Array(await image.arrayBuffer())).metadata();
      assert.equal(meta.format, "webp"); assert.equal(meta.exif, undefined); assert.equal(meta.width, 80); assert.equal(meta.height, 120);
      assert.equal((await media(first, adminCookie)).status, 200);
      assert.equal((await save(path, { ...body, portraitStorageKey: "forged-key" }, cookie)).status, 400);
      assert.equal((await save(path, { ...body, photoUrl: portraitUrl(first) }, cookie)).status, 400);
      assert.equal((await save(path, { ...body, name: "Sólo texto" }, cookie)).status, 200);
      assert.equal((await stored()).portraitStorageKey, first);

      for (const [editorPath, editorCookie] of [["/panel/perfil", a.cookie], [`/admin/conductores/${a.id}/editar`, adminCookie]]) {
        const response = await fetch(`${base}${editorPath}`, { headers: { Cookie: editorCookie } }); assert.equal(response.status, 200);
        const html = await response.text(); assert.match(html, /id="driverPhoto"[^>]*type="file"/);
        assert.doesNotMatch(html, /Enlace a la fotografía del conductor/); assert.ok(html.includes(portraitUrl(first)!));
      }
      const padded = new Uint8Array(6 * 1024 * 1024); padded.set(bytes);
      const largePhoto = new File([padded], "foto-grande.jpg", { type: "image/jpeg" });
      const count = await database.driverPhoto.count({ where: { driverId: a.id } });
      assert.equal((await upload(path, { ...body, vehicle: car }, cookie, largePhoto, largePhoto)).status, 200);
      const second = (await stored()).portraitStorageKey!; assert.notEqual(second, first);
      assert.equal((await media(first, adminCookie)).status, 404); assert.equal((await media(second, cookie)).status, 200);
      assert.equal(await database.driverPhoto.count({ where: { driverId: a.id } }), count + 1);
      assert.equal((await database.driver.findUniqueOrThrow({ where: { id: b.id } })).portraitStorageKey, null);
      await database.driver.update({ where: { id: a.id }, data: { active: true } });
      const publicHtml = await (await fetch(`${base}/conductor/${a.slug}`)).text();
      assert.match(publicHtml, new RegExp(`class="avatar-photo"[^>]+src="${portraitUrl(second)}"`));
      assert.equal((await media(second)).status, 200);
    });
    await t.test("el retrato funciona con la galería llena y respeta sesiones revocadas", async () => {
      const count = await database.driverPhoto.count({ where: { driverId: a.id } });
      await database.driverPhoto.createMany({ data: Array.from({ length: 24 - count }, (_, position) => ({ driverId: a.id, category: "TRIP" as const, caption: "CI límite", storageKey: `${randomUUID()}.webp`, width: 1, height: 1, position: position + 10 })) });
      const path = "/api/driver/perfil";
      const previous = (await stored()).portraitStorageKey;
      assert.equal((await upload(path, profile, a.cookie)).status, 200);
      const current = (await stored()).portraitStorageKey!; assert.notEqual(current, previous);
      assert.equal(await database.driverPhoto.count({ where: { driverId: a.id } }), 24);
      assert.equal((await upload(path, { ...profile, name: "No guardar", vehicle: car }, a.cookie, photo, photo)).status, 409);
      const tooLarge = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "grande.jpg", { type: "image/jpeg" });
      assert.equal((await upload(path, profile, a.cookie, tooLarge)).status, 400);
      assert.equal((await stored()).portraitStorageKey, current);
      assert.equal((await stored()).name, profile.name);
      await database.driver.update({ where: { id: a.id }, data: { active: false } });
      await database.adminUser.update({ where: { id: admin.id }, data: { active: false } });
      assert.equal((await media(current, adminCookie)).status, 404);
      assert.equal((await media(current, a.cookie)).status, 200);
      await database.adminUser.update({ where: { id: admin.id }, data: { active: true } });
      await database.adminSession.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(0) } });
      assert.equal((await media(current, adminCookie)).status, 404);
      await database.driverUser.update({ where: { driverId: a.id }, data: { active: false } });
      assert.equal((await media(current, a.cookie)).status, 404);
      assert.equal((await fetch(`${base}/media/retratos/invalid-key`)).status, 404);
    });
  } finally {
    const created = await database.driver.findUnique({ where: { slug: newSlug }, select: { id: true } });
    for (const id of [...fixtures.map(fixture => fixture.id), ...(created ? [created.id] : [])]) {
      await database.vehicle.deleteMany({ where: { driverId: id } });
      await database.driverUser.deleteMany({ where: { driverId: id } });
      await database.driver.delete({ where: { id } });
    }
    if (adminId) await database.adminUser.delete({ where: { id: adminId } });
    await database.$disconnect();
    // Los archivos de estas pruebas se retiran al destruir el volumen desechable de CI.
  }
});
