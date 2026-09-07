import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { createDatabase } from "../../src/lib/database";
import { hashToken, SESSION_COOKIE } from "../../src/lib/security";

const username = process.env.ADMIN_USERNAME || "";
const password = process.env.ADMIN_PASSWORD || "";
if (process.env.ALLOW_INTEGRATION_TESTS !== "1" || !username.startsWith("ci-") || !password || !process.env.TEST_BASE_URL) {
  throw new Error("Estas pruebas requieren una base desechable de CI, ALLOW_INTEGRATION_TESTS=1, TEST_BASE_URL y una cuenta ci-.");
}
const database = createDatabase();
const base = process.env.TEST_BASE_URL;
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
const run = promisify(execFile);
const request = (path: string, options: RequestInit = {}) => fetch(`${base}${path}`, { redirect: "manual", ...options });
const post = (path: string, body: unknown, cookie = "", method = "POST", requestOrigin: string | null = origin) => request(path, {
  method, headers: { "Content-Type": "application/json", ...(requestOrigin ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
});
const login = (cookie = "") => post("/api/admin/login", { username, password }, cookie);
const cookieFrom = (response: Response) => {
  const header = response.headers.get("set-cookie");
  assert.ok(header); assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=Lax/i);
  assert.match(header, /Max-Age=28800/i);
  assert.equal(/; Secure/i.test(header), origin.startsWith("https:"));
  return header.split(";")[0];
};
const tokenFrom = (cookie: string) => cookie.slice(cookie.indexOf("=") + 1);

test("administración y perfiles con MySQL y el contenedor de producción", { timeout: 180_000 }, async (t) => {
  const suffix = randomBytes(6).toString("hex");
  const slug = `ci-driver-${suffix}`;
  const privatePlate = `PRIVATE-${suffix}`;
  let driverId: string | undefined;
  let cookie = "";
  const admin = await database.adminUser.findUniqueOrThrow({ where: { username } });
  const input = { name: `Conductor CI ${suffix}`, slug, phone: "+507 (6000) 0000", whatsapp: "+507 6000 0001", email: "conductor@example.test", location: "Ciudad de prueba", experience: 5, languages: ["Español", "English"], description: "Perfil para pruebas; con contacto, seguro.\nSegunda línea.", photoUrl: "", active: false, verified: false, serviceIds: ["airport"], vehicle: { brand: "Marca CI", model: "Modelo CI", year: 2024, color: "Azul", plate: privatePlate, passengers: 4, description: "Vehículo de prueba", photoUrl: "" } };
  try {
    await t.test("no permite leer datos privados ni modificar sin sesión y origen válido", async () => {
      assert.equal((await request("/api/admin/conductores")).status, 401);
      assert.equal((await post("/api/admin/conductores", input)).status, 401);
      assert.equal((await request("/admin")).headers.get("location"), "/login-admin");
      assert.equal((await post("/api/admin/login", { username, password }, "", "POST", null)).status, 403);
      assert.equal((await post("/api/admin/login", { username, password }, "", "POST", "https://attacker.example.test")).status, 403);
      const wrong = await post("/api/admin/login", { username, password: "wrong-password" });
      const unknown = await post("/api/admin/login", { username: `ci-unknown-${suffix}`, password: "wrong-password" });
      assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
      assert.deepEqual(await wrong.json(), await unknown.json());
    });

    await t.test("autentica, almacena sólo la huella y rota la sesión al entrar nuevamente", async () => {
      const response = await login(); assert.equal(response.status, 200); cookie = cookieFrom(response);
      const token = tokenFrom(cookie);
      assert.ok(await database.adminSession.findUnique({ where: { tokenHash: hashToken(token) } }));
      assert.equal(await database.adminSession.findUnique({ where: { tokenHash: token } }), null);
      assert.equal((await request("/admin", { headers: { Cookie: cookie } })).status, 200);
      const oldCookie = cookie;
      const rotated = await login(cookie); assert.equal(rotated.status, 200); cookie = cookieFrom(rotated);
      assert.notEqual(cookie, oldCookie);
      assert.equal((await request("/api/admin/conductores", { headers: { Cookie: oldCookie } })).status, 401);
      assert.equal((await post("/api/admin/conductores", input, cookie, "POST", "https://attacker.example.test")).status, 403);
      assert.equal((await post("/api/admin/logout", {}, cookie, "POST", null)).status, 403);
    });

    await t.test("valida entradas, guarda borrador con vehículo y protege el perfil", async () => {
      for (const change of [{ slug: "demo" }, { phone: "60000000" }, { adminId: admin.id }, { serviceIds: ["missing-service"] }]) {
        assert.equal((await post("/api/admin/conductores", { ...input, ...change }, cookie)).status, 400);
      }
      assert.equal(await database.driver.count({ where: { slug } }), 0);
      assert.equal((await request("/api/admin/conductores", { method: "POST", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: "{" })).status, 400);
      assert.equal((await request("/api/admin/conductores", { method: "POST", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ value: "x".repeat(40_000) }) })).status, 413);
      const created = await post("/api/admin/conductores", input, cookie);
      assert.equal(created.status, 201); driverId = (await created.json()).id;
      assert.ok(driverId);
      const saved = await database.driver.findUniqueOrThrow({ where: { id: driverId }, include: { vehicles: true, services: true } });
      assert.equal(saved.phone, "+50760000000"); assert.equal(saved.vehicles[0].plate, privatePlate); assert.equal(saved.services[0].id, "airport");
      assert.equal((await post("/api/admin/conductores", input, cookie)).status, 409);
      const draftPage = await request(`/conductor/${slug}`);
      assert.ok([200, 404].includes(draftPage.status)); // Next puede transmitir el 404 dentro de una respuesta iniciada.
      const draft = await draftPage.text(); assert.ok(!draft.includes(input.name)); assert.ok(draft.includes("Perfil no disponible"));
      assert.equal((await request(`/conductor/${slug}/contacto`)).status, 404);
      const editor = await request(`/admin/conductores/${driverId}/editar`, { headers: { Cookie: cookie } });
      assert.equal(editor.status, 200); assert.ok((await editor.text()).includes(privatePlate));
    });

    await t.test("publica campos permitidos y vCard, conserva el slug NFC y permite retirar el perfil", async () => {
      const path = `/api/admin/conductores/${driverId}`;
      assert.equal((await post(path, { ...input, slug: `${slug}-changed` }, cookie, "PATCH")).status, 409);
      assert.equal((await post(path, { ...input, name: "Should roll back", serviceIds: ["missing-service"] }, cookie, "PATCH")).status, 400);
      assert.equal((await database.driver.findUniqueOrThrow({ where: { id: driverId } })).name, input.name);
      assert.equal((await post(path, { ...input, active: true, verified: true }, cookie, "PATCH")).status, 200);
      const publicPage = await request(`/conductor/${slug}`); assert.equal(publicPage.status, 200);
      const html = await publicPage.text(); assert.ok(html.includes(input.name)); assert.ok(html.includes("Marca CI")); assert.ok(html.includes("Traslados al aeropuerto"));
      for (const secret of [privatePlate, driverId!, admin.id, admin.passwordHash]) assert.ok(!html.includes(secret));
      const contact = await request(`/conductor/${slug}/contacto`); assert.equal(contact.status, 200);
      assert.match(contact.headers.get("content-type") || "", /text\/vcard/);
      assert.equal(contact.headers.get("cache-control"), "no-store");
      const card = await contact.text(); assert.ok(card.includes("TEL;TYPE=CELL:+50760000000")); assert.ok(card.includes(`URL:${origin}/conductor/${slug}`)); assert.ok(!card.includes(privatePlate));
      assert.equal((await post(path, { ...input, active: true, vehicle: null }, cookie, "PATCH")).status, 200);
      assert.equal(await database.vehicle.count({ where: { driverId, active: true } }), 0);
      assert.ok(!(await (await request(`/conductor/${slug}`)).text()).includes("Marca CI"));
      assert.equal((await post(path, input, cookie, "PATCH")).status, 200);
      assert.ok(!(await (await request(`/conductor/${slug}`)).text()).includes(input.name));
      assert.equal((await request(`/conductor/${slug}/contacto`)).status, 404);
    });

    await t.test("rechaza sesiones alteradas, vencidas y de cuentas desactivadas", async () => {
      assert.equal((await request("/api/admin/conductores", { headers: { Cookie: `${SESSION_COOKIE}=${"a".repeat(64)}` } })).status, 401);
      await database.adminSession.update({ where: { tokenHash: hashToken(tokenFrom(cookie)) }, data: { expiresAt: new Date(0) } });
      assert.equal((await request("/api/admin/conductores", { headers: { Cookie: cookie } })).status, 401);
      const response = await login(); assert.equal(response.status, 200); cookie = cookieFrom(response);
      await database.adminUser.update({ where: { id: admin.id }, data: { active: false } });
      assert.equal((await request("/api/admin/conductores", { headers: { Cookie: cookie } })).status, 401);
      await database.adminUser.update({ where: { id: admin.id }, data: { active: true } });
    });

    await t.test("el cambio de contraseña por consola revoca sesiones y salir impide reutilizarlas", async () => {
      await assert.rejects(run(process.execPath, ["--import", "tsx", "scripts/create-admin.ts"], { env: process.env }));
      await run(process.execPath, ["--import", "tsx", "scripts/create-admin.ts", "--reset-password"], { env: process.env });
      assert.equal((await request("/api/admin/conductores", { headers: { Cookie: cookie } })).status, 401);
      const response = await login(); assert.equal(response.status, 200); cookie = cookieFrom(response);
      const logout = await post("/api/admin/logout", {}, cookie); assert.equal(logout.status, 200);
      assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/i);
      assert.equal((await request("/api/admin/conductores", { headers: { Cookie: cookie } })).status, 401);
    });

    await t.test("limita intentos por cuenta usando contadores persistentes", async () => {
      const unknown = `ci-rate-${suffix}`;
      for (let index = 0; index < 8; index++) assert.equal((await post("/api/admin/login", { username: unknown, password: "wrong-password" })).status, 401);
      assert.equal((await post("/api/admin/login", { username: unknown, password: "wrong-password" })).status, 429);
      assert.ok(await database.adminLoginAttempt.findFirst({ where: { key: { endsWith: hashToken(`login:${unknown}`) }, attempts: { gte: 9 } } }));
    });
  } finally {
    if (driverId) {
      await database.vehicle.deleteMany({ where: { driverId } });
      await database.driver.delete({ where: { id: driverId } });
    }
    await database.adminUser.update({ where: { id: admin.id }, data: { active: true } });
    await database.adminSession.deleteMany({ where: { adminId: admin.id } });
    await database.$disconnect();
  }
});
