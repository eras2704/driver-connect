import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";

if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere una base desechable CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL, origin = process.env.APP_ORIGIN!;

test("administración crea y edita conductores con foto, respeta borradores y guarda de forma atómica", { timeout: 120_000 }, async () => {
  const suffix = randomBytes(5).toString("hex"), slug = `ci-admin-photo-${suffix}`;
  let adminId: string | undefined, otherId: string | undefined;
  try {
    const admin = await database.adminUser.create({ data: { username: `ci-photo-admin-${suffix}`, name: "Admin CI", passwordHash: "unused-ci-fixture", active: true } });
    adminId = admin.id;
    const token = randomBytes(32).toString("hex"), cookie = `${SESSION_COOKIE}=${token}`;
    await database.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const other = await database.driver.create({ data: { slug: `ci-other-photo-${suffix}`, name: "Otro conductor", user: { create: { username: `ci-photo-other-${suffix}`, passwordHash: "unused-ci-fixture", active: true, mustChangePassword: false } } }, include: { user: true } });
    otherId = other.id;
    const otherToken = randomBytes(32).toString("hex"), driverCookie = `dc_driver_session=${otherToken}`;
    await database.driverSession.create({ data: { userId: other.user!.id, tokenHash: hashToken(`driver:${otherToken}`), expiresAt: new Date(Date.now() + 3600_000) } });

    const profile = { name: "Conductor desde administración", slug, active: false, verified: false, experience: 5, languages: ["Español"], serviceIds: [] as string[], vehicle: { brand: "Toyota", model: "Prado", year: 2024, passengers: 4, photoUrl: "https://example.test/previous.jpg" } };
    const bytes = new Uint8Array(await sharp({ create: { width: 120, height: 80, channels: 3, background: "#285c85" } }).jpeg().toBuffer());
    const image = new File([bytes], "carro.jpg", { type: "image/jpeg" });
    const upload = (id?: string, body: object = profile, file: File = image, requestCookie = cookie, requestOrigin = origin, consent = "yes") => {
      const form = new FormData(); form.set("profile", JSON.stringify(body)); form.set("vehiclePhoto", file); form.set("consent", consent);
      return fetch(`${base}/api/admin/conductores${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", headers: { Origin: requestOrigin, Cookie: requestCookie }, body: form });
    };
    const save = (id: string, body: object) => fetch(`${base}/api/admin/conductores/${id}`, { method: "PATCH", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const media = (id: string, requestCookie = "") => fetch(`${base}/media/${id}`, { headers: { Cookie: requestCookie } });

    assert.equal((await upload(undefined, profile, image, "")).status, 401);
    assert.equal((await upload(undefined, profile, image, driverCookie)).status, 401);
    assert.equal((await upload(undefined, profile, image, cookie, "https://wrong.test")).status, 403);
    assert.equal((await upload(undefined, profile, image, cookie, origin, "")).status, 400);
    assert.equal((await upload(undefined, { ...profile, vehicle: null })).status, 400);
    assert.equal((await upload(undefined, profile, new File(["<svg/>"], "falsa.jpg", { type: "image/jpeg" }))).status, 400);
    assert.equal((await upload(undefined, { ...profile, serviceIds: ["missing-ci-service"] })).status, 400);
    assert.equal(await database.driver.count({ where: { slug } }), 0);

    const created = await upload(); assert.equal(created.status, 201);
    const { id } = await created.json();
    const first = await database.driverPhoto.findFirstOrThrow({ where: { driverId: id } });
    assert.equal(first.category, "VEHICLE"); assert.equal(first.caption, "Toyota Prado");
    assert.equal((await upload()).status, 409); // Un slug repetido no deja otra foto asociada.
    assert.equal(await database.driverPhoto.count({ where: { driverId: id } }), 1);
    assert.equal((await media(first.id)).status, 404);
    assert.equal((await media(first.id, driverCookie)).status, 404);
    const draft = await media(first.id, cookie); assert.equal(draft.status, 200);
    assert.equal(draft.headers.get("content-type"), "image/webp"); assert.equal(draft.headers.get("cache-control"), "private, no-store");
    await database.adminUser.update({ where: { id: adminId }, data: { active: false } });
    assert.equal((await media(first.id, cookie)).status, 404);
    assert.equal((await upload(id)).status, 401);
    await database.adminUser.update({ where: { id: adminId }, data: { active: true } });
    await database.adminSession.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(0) } });
    assert.equal((await media(first.id, cookie)).status, 404);
    await database.adminSession.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(Date.now() + 3600_000) } });

    const editor = await fetch(`${base}/admin/conductores/${id}/editar`, { headers: { Cookie: cookie } });
    assert.equal(editor.status, 200);
    const html = await editor.text();
    assert.match(html, /id="vehiclePhoto"[^>]*type="file"/); assert.doesNotMatch(html, /Enlace a la fotografía del vehículo/);
    assert.ok(html.includes(`/media/${first.id}`));
    assert.equal((await upload(id, profile, image, driverCookie)).status, 401);
    assert.equal((await upload(id, profile, image, cookie, "https://wrong.test")).status, 403);
    assert.equal((await upload(id, { ...profile, slug: `${slug}-changed` })).status, 409);
    assert.equal((await upload(id, { ...profile, driverId: other.id })).status, 400);
    assert.equal((await upload(id, { ...profile, name: "No debe guardarse", serviceIds: ["missing-ci-service"] })).status, 400);
    assert.equal((await upload("ci-missing-driver")).status, 404);
    assert.equal(await database.driverPhoto.count({ where: { driverId: id } }), 1);
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id } })).name, profile.name);

    const updated = { ...profile, vehicle: { ...profile.vehicle, model: "Fortuner" } };
    assert.equal((await upload(id, updated)).status, 200);
    const photos = await database.driverPhoto.findMany({ where: { driverId: id }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    assert.equal(photos.length, 2); assert.equal(photos[0].caption, "Toyota Fortuner"); assert.equal(photos[1].id, first.id);
    assert.equal((await database.vehicle.findFirstOrThrow({ where: { driverId: id } })).model, "Fortuner");
    assert.equal((await save(id, { ...updated, active: true })).status, 200);
    assert.equal(await database.driverPhoto.count({ where: { driverId: id } }), 2);
    assert.equal((await media(photos[0].id)).status, 200);
    const publicHtml = await (await fetch(`${base}/conductor/${slug}`)).text();
    assert.match(publicHtml, new RegExp(`class="public-visual"><img[^>]+src="/media/${photos[0].id}"`));
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id: other.id } })).name, "Otro conductor");
    assert.equal(await database.driverPhoto.count({ where: { driverId: other.id } }), 0);

    await database.driverPhoto.createMany({ data: Array.from({ length: 21 }, (_, position) => ({ driverId: id, category: "TRIP" as const, caption: "CI límite", storageKey: `${randomUUID()}.webp`, width: 1, height: 1, position: position + 1 })) });
    const results = await Promise.all([upload(id, { ...updated, name: "Guardado A" }), upload(id, { ...updated, name: "Guardado B" })]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal(await database.driverPhoto.count({ where: { driverId: id } }), 24);
    const winner = results[0].ok ? "Guardado A" : "Guardado B";
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id } })).name, winner);
  } finally {
    // Sólo se ejecuta en CI: los archivos de prueba se retiran al destruir su volumen desechable.
    const created = await database.driver.findUnique({ where: { slug }, select: { id: true } });
    for (const id of [created?.id, otherId].filter((id): id is string => Boolean(id))) {
      await database.vehicle.deleteMany({ where: { driverId: id } });
      await database.driverUser.deleteMany({ where: { driverId: id } });
      await database.driver.delete({ where: { id } });
    }
    if (adminId) await database.adminUser.delete({ where: { id: adminId } });
    await database.$disconnect();
  }
});
