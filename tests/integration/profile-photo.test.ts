import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createDatabase } from "../../src/lib/database";
import { hashToken } from "../../src/lib/security";

if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere una base desechable CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL, origin = process.env.APP_ORIGIN!;

test("la foto del vehículo se sube desde el perfil y se guarda junto con sus datos", { timeout: 120_000 }, async () => {
  const fixtures: { id: string; slug: string; cookie: string }[] = [];
  const suffix = randomBytes(5).toString("hex");
  try {
    for (const label of ["a", "b"]) {
      const slug = `ci-car-${label}-${suffix}`;
      const driver = await database.driver.create({ data: { slug, name: "Conductor original", active: true, user: { create: { username: slug, passwordHash: "unused-ci-fixture", active: true, mustChangePassword: false } } }, include: { user: true } });
      const token = randomBytes(32).toString("hex");
      await database.driverSession.create({ data: { userId: driver.user!.id, tokenHash: hashToken(`driver:${token}`), expiresAt: new Date(Date.now() + 3600_000) } });
      fixtures.push({ id: driver.id, slug, cookie: `dc_driver_session=${token}` });
    }
    const [a, b] = fixtures;
    const profile = { name: "Conductor actualizado", experience: 5, languages: ["Español"], serviceIds: [] as string[], vehicle: { brand: "Toyota", model: "Prado", year: 2024, passengers: 4, photoUrl: "https://example.test/previous.jpg" } };
    const bytes = new Uint8Array(await sharp({ create: { width: 120, height: 80, channels: 3, background: "#285c85" } }).jpeg().toBuffer());
    const photo = new File([bytes], "vehiculo.jpg", { type: "image/jpeg" });
    const save = (body: object) => fetch(`${base}/api/driver/perfil`, { method: "PATCH", headers: { Origin: origin, Cookie: a.cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const upload = (body: object = profile, file: File = photo, cookie = a.cookie, requestOrigin = origin, consent = "yes") => {
      const form = new FormData(); form.set("profile", JSON.stringify(body)); form.set("vehiclePhoto", file); form.set("consent", consent);
      return fetch(`${base}/api/driver/perfil`, { method: "PATCH", headers: { Origin: requestOrigin, Cookie: cookie }, body: form });
    };

    assert.equal((await upload(profile, photo, "")).status, 401);
    assert.equal((await upload(profile, photo, a.cookie, "https://wrong.test")).status, 403);
    assert.equal((await upload({ ...profile, name: "" })).status, 400);
    assert.equal((await upload(profile, photo, a.cookie, origin, "")).status, 400);
    assert.equal((await upload({ ...profile, vehicle: null })).status, 400);
    assert.equal((await upload({ ...profile, driverId: b.id })).status, 400);
    // La extensión o el MIME no bastan para que se acepte un archivo como imagen.
    assert.equal((await upload(profile, new File(["<svg/>"], "falsa.jpg", { type: "image/jpeg" }))).status, 400);
    assert.equal((await upload(profile, new File([new Uint8Array(8 * 1024 * 1024 + 1)], "grande.jpg", { type: "image/jpeg" }))).status, 400);
    // El servicio inexistente falla dentro de la transacción, después de procesar el archivo.
    assert.equal((await upload({ ...profile, serviceIds: ["ci-no-service"] })).status, 400);
    assert.equal(await database.driverPhoto.count({ where: { driverId: a.id } }), 0);
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id: a.id } })).name, "Conductor original");
    assert.equal(await database.vehicle.count({ where: { driverId: a.id } }), 0);

    assert.equal((await save(profile)).status, 200); // Se conservan los enlaces existentes al editar sin foto nueva.
    assert.equal((await database.vehicle.findFirstOrThrow({ where: { driverId: a.id } })).photoUrl, profile.vehicle.photoUrl);
    assert.equal((await upload()).status, 200);
    const first = await database.driverPhoto.findFirstOrThrow({ where: { driverId: a.id } });
    assert.equal(first.category, "VEHICLE"); assert.equal(first.caption, "Toyota Prado");
    assert.equal((await upload({ ...profile, vehicle: { ...profile.vehicle, model: "Fortuner" } })).status, 200);
    const photos = await database.driverPhoto.findMany({ where: { driverId: a.id }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    assert.equal(photos.length, 2); assert.equal(photos[0].caption, "Toyota Fortuner"); assert.equal(photos[1].id, first.id);
    assert.equal((await database.vehicle.findFirstOrThrow({ where: { driverId: a.id } })).model, "Fortuner");
    assert.equal(await database.driverPhoto.count({ where: { driverId: b.id } }), 0);
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id: b.id } })).name, "Conductor original");
    const media = await fetch(`${base}/media/${photos[0].id}`);
    assert.equal(media.status, 200); assert.equal(media.headers.get("content-type"), "image/webp");

    const html = await (await fetch(`${base}/conductor/${a.slug}`)).text();
    assert.match(html, new RegExp(`class="public-visual"><img[^>]+src="/media/${photos[0].id}"`));
    const formHtml = await (await fetch(`${base}/panel/perfil`, { headers: { Cookie: a.cookie } })).text();
    assert.match(formHtml, /id="vehiclePhoto"[^>]*type="file"/);
    assert.doesNotMatch(formHtml, /Enlace a la fotografía del vehículo/);
    assert.ok(formHtml.includes(`/media/${photos[0].id}`));
    assert.equal((await save(profile)).status, 200);
    assert.equal(await database.driverPhoto.count({ where: { driverId: a.id } }), 2); // Guardar otros datos no duplica imágenes.

    await database.driverPhoto.createMany({ data: Array.from({ length: 22 }, (_, position) => ({ driverId: a.id, category: "TRIP" as const, caption: "CI límite", storageKey: `${randomUUID()}.webp`, width: 1, height: 1, position: position + 1 })) });
    assert.equal((await upload({ ...profile, name: "No debe guardarse" })).status, 409);
    assert.equal(await database.driverPhoto.count({ where: { driverId: a.id } }), 24);
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id: a.id } })).name, profile.name);
    await database.driverPhoto.deleteMany({ where: { driverId: a.id, category: "TRIP" } });

    await database.driver.update({ where: { id: a.id }, data: { active: false } });
    assert.equal((await fetch(`${base}/media/${photos[0].id}`)).status, 404);
    assert.equal((await fetch(`${base}/media/${photos[0].id}`, { headers: { Cookie: a.cookie } })).status, 200);
    assert.equal((await fetch(`${base}/media/${photos[0].id}`, { headers: { Cookie: b.cookie } })).status, 404);
  } finally {
    for (const driver of fixtures) {
      const photos = await database.driverPhoto.findMany({ where: { driverId: driver.id }, select: { id: true } });
      for (const photo of photos) await fetch(`${base}/api/driver/fotos/${photo.id}`, { method: "DELETE", headers: { Origin: origin, Cookie: driver.cookie } });
      await database.vehicle.deleteMany({ where: { driverId: driver.id } });
      await database.driverUser.deleteMany({ where: { driverId: driver.id } });
      await database.driver.delete({ where: { id: driver.id } });
    }
    await database.$disconnect();
  }
});
