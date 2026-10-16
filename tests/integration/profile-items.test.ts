import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { randomBytes, randomUUID } from "node:crypto";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";
import { localDateTime } from "../../src/lib/calendar";
if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !process.env.ADMIN_USERNAME?.startsWith("ci-") || !process.env.TEST_BASE_URL) throw new Error("Requiere base desechable de CI.");
const database = createDatabase(), base = process.env.TEST_BASE_URL!, origin = process.env.APP_ORIGIN!;
test("cinco servicios propios, varios vehículos, fotos, propiedad y reservas", { timeout: 120_000 }, async () => {
  const suffix = randomBytes(5).toString("hex"); const ids: string[] = []; let adminId: string | undefined;
  try {
    const admin = await database.adminUser.create({ data: { username: `ci-items-${suffix}`, name: "Admin CI", passwordHash: "unused", active: true } }); adminId = admin.id;
    const token = randomBytes(32).toString("hex"), adminCookie = `${SESSION_COOKIE}=${token}`;
    await database.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const driver = await database.driver.create({ data: { slug: `ci-items-${suffix}`, qrSlug: `ci-items-${suffix}`, name: "Flota CI", active: true, services: { connect: { id: "airport" } } } }); ids.push(driver.id);
    const other = await database.driver.create({ data: { slug: `ci-items-other-${suffix}`, name: "Otro CI", active: true } }); ids.push(other.id);
    const driverToken = randomBytes(32).toString("hex"), driverCookie = `dc_driver_session=${driverToken}`;
    const user = await database.driverUser.create({ data: { driverId: driver.id, username: `ci-items-driver-${suffix}`, passwordHash: "unused", active: true, mustChangePassword: false } });
    await database.driverSession.create({ data: { userId: user.id, tokenHash: hashToken(`driver:${driverToken}`), expiresAt: new Date(Date.now() + 3600_000) } });
    const send = (path: string, body: unknown, cookie = driverCookie, method = "POST", requestOrigin = origin) => fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", Origin: requestOrigin, Cookie: cookie }, body: JSON.stringify(body) });
    const service = { name: "Traslado privado CI", nameEn: "CI private transfer", description: "Servicio propio", descriptionEn: "Private service" };
    assert.equal((await send("/api/driver/prestaciones", service, "")).status, 401);
    assert.equal((await send("/api/driver/prestaciones", service, driverCookie, "POST", "https://invalid.test")).status, 403);
    const services: string[] = [];
    for (let i = 0; i < 5; i++) { const response = await send("/api/driver/prestaciones", { ...service, name: `${service.name} ${i}` }); assert.equal(response.status, 200); services.push((await response.json()).id); }
    assert.equal((await send("/api/driver/prestaciones", { ...service, name: "Sexto" })).status, 409);
    let first = await database.profileService.findUniqueOrThrow({ where: { id: services[0] } });
    assert.equal((await send(`/api/admin/conductores/${other.id}/prestaciones`, { ...service, id: first.id, updatedAt: first.updatedAt.toISOString() }, adminCookie)).status, 404);
    const stale = first.updatedAt.toISOString();
    assert.equal((await send("/api/driver/prestaciones", { ...service, id: first.id, updatedAt: stale, name: "Servicio editado CI" })).status, 200);
    assert.equal((await send("/api/driver/prestaciones", { ...service, id: first.id, updatedAt: stale })).status, 409);
    const vehicle = { brand: "Toyota CI", model: "Flota", year: 2024, passengers: 4, plate: `PRIVATE-${suffix}`, color: "Azul", description: "Flota propia", photoUrl: "" };
    const vehicleIds: string[] = [];
    for (let i = 0; i < 10; i++) { const response = await send("/api/driver/vehiculos", { ...vehicle, model: `Modelo CI ${i}`, passengers: i === 2 ? 8 : 4 }); assert.equal(response.status, 200); vehicleIds.push((await response.json()).id); }
    assert.equal((await send("/api/driver/vehiculos", vehicle)).status, 409);
    const car = await database.vehicle.findUniqueOrThrow({ where: { id: vehicleIds[2] } });
    assert.equal((await send(`/api/admin/conductores/${other.id}/vehiculos`, { ...vehicle, id: car.id, updatedAt: car.updatedAt.toISOString() }, adminCookie)).status, 404);
    const image = new File([new Uint8Array(await sharp({ create: { width: 40, height: 30, channels: 3, background: "blue" } }).png().toBuffer())], "foto.png", { type: "image/png" });
    const upload = async (path: string, body: unknown) => { const form = new FormData(); form.set("profile", JSON.stringify(body)); form.set("vehiclePhoto", image); form.set("consent", "yes"); return fetch(`${base}${path}`, { method: "POST", headers: { Origin: origin, Cookie: driverCookie }, body: form }); };
    assert.equal((await upload("/api/driver/vehiculos", { ...vehicle, model: "Modelo CI 2", id: car.id, updatedAt: car.updatedAt.toISOString(), passengers: 8 })).status, 200);
    const photoCar = await database.vehicle.findUniqueOrThrow({ where: { id: car.id } });
    assert.equal((await fetch(`${base}/media/vehiculos/${photoCar.photoStorageKey}`)).status, 200);
    first = await database.profileService.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal((await upload("/api/driver/prestaciones", { ...service, name: "Servicio editado CI", id: first.id, updatedAt: first.updatedAt.toISOString() })).status, 200);
    const photoService = await database.profileService.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal((await fetch(`${base}/media/prestaciones/${photoService.photoStorageKey}`)).status, 200);
    const html = await (await fetch(`${base}/conductor/${driver.slug}`)).text();
    assert.ok(html.includes("Servicio editado CI")); for (let i = 0; i < 10; i++) assert.ok(html.includes(`Modelo CI ${i}`));
    assert.ok(!html.includes(vehicle.plate)); assert.ok(html.includes("Idioma / Language"));
    const request = { serviceId: first.id, customerName: "Cliente CI", phone: "+50760000000", email: "", pickup: "Hotel", destination: "Aeropuerto", passengers: 8, startsAt: localDateTime(new Date(Date.now() + 3 * 86400_000)), requestId: randomUUID(), consent: true, notes: "" };
    assert.equal((await send(`/api/reservas/${driver.slug}`, request, "")).status, 201);
    assert.equal((await database.booking.findFirstOrThrow({ where: { driverId: driver.id } })).serviceName, "Servicio editado CI");
    assert.equal((await send(`/api/reservas/${other.slug}`, { ...request, requestId: randomUUID() }, "")).status, 404);
    assert.equal((await send("/api/driver/prestaciones", { id: first.id, updatedAt: photoService.updatedAt.toISOString() }, driverCookie, "DELETE")).status, 200);
    assert.equal((await fetch(`${base}/media/prestaciones/${photoService.photoStorageKey}`)).status, 404);
    assert.equal((await database.booking.findFirstOrThrow({ where: { driverId: driver.id } })).serviceName, "Servicio editado CI");
    assert.equal((await database.driver.findUniqueOrThrow({ where: { id: driver.id } })).qrSlug, driver.qrSlug);
  } finally {
    for (const id of ids) { await database.booking.deleteMany({ where: { driverId: id } }); await database.driverUser.deleteMany({ where: { driverId: id } }); await database.vehicle.deleteMany({ where: { driverId: id } }); await database.driver.delete({ where: { id } }); }
    if (adminId) await database.adminUser.delete({ where: { id: adminId } });
    await database.$disconnect();
  }
});
