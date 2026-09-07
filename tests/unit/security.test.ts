import assert from "node:assert/strict";
import test from "node:test";
import { authConfiguration, hashToken, newSessionToken, passwordError, sameOrigin, validTokenFormat } from "../../src/lib/security";
import { driverSchema, loginSchema, slugSchema } from "../../src/lib/validation";
import { contactVcard, escapeVcard } from "../../src/lib/vcard";

test("el origen de producción exige HTTPS y una clave de sesión fuerte", () => {
  const env = { SESSION_SECRET: "x".repeat(64), APP_ORIGIN: "https://drivers.example.test" };
  assert.equal(authConfiguration(env).secure, true);
  assert.equal(authConfiguration({ ...env, APP_ORIGIN: "http://127.0.0.1:3000" }).secure, false);
  for (const origin of ["http://drivers.example.test", "https://drivers.example.test/path", "https://user:password@example.test", "https://example.test?query=x", "file:///tmp"]) {
    assert.throws(() => authConfiguration({ ...env, APP_ORIGIN: origin }));
  }
  assert.throws(() => authConfiguration({ ...env, SESSION_SECRET: "short" }));
  assert.equal(sameOrigin(null, env.APP_ORIGIN), false);
  assert.equal(sameOrigin("https://drivers.example.test.attacker.test", env.APP_ORIGIN), false);
  assert.equal(sameOrigin(env.APP_ORIGIN, env.APP_ORIGIN), true);
});

test("la base almacena una huella HMAC y las contraseñas respetan los límites de bcrypt", () => {
  const token = newSessionToken();
  assert.equal(validTokenFormat(token), true);
  assert.notEqual(token, newSessionToken());
  assert.notEqual(hashToken(token, "first-secret"), token);
  assert.notEqual(hashToken(token, "first-secret"), hashToken(token, "second-secret"));
  for (const value of ["", token.slice(1), token + "a", "g".repeat(64)]) assert.equal(validTokenFormat(value), false);
  assert.ok(passwordError("short"));
  assert.equal(passwordError("a".repeat(72)), undefined);
  assert.ok(passwordError("a".repeat(73)));
  assert.equal(passwordError("é".repeat(36)), undefined);
  assert.ok(passwordError("é".repeat(37)));
});

test("el formulario limita campos, normaliza teléfonos y reserva direcciones del sistema", () => {
  const driver = { name: "Conductor Prueba", slug: "conductor-prueba", phone: "+507 (6000) 0000", experience: 5, languages: ["Español"], active: false, verified: false, serviceIds: ["airport", "airport"], vehicle: null };
  const valid = driverSchema.parse(driver);
  assert.equal(valid.phone, "+50760000000");
  assert.deepEqual(valid.serviceIds, ["airport"]);
  for (const slug of ["demo", "admin", "api", "login-admin", "panel", "../admin", "Foo", "x", "foo--bar"]) assert.equal(slugSchema.safeParse(slug).success, false);
  for (const change of [{ phone: "60000000" }, { photoUrl: "javascript:alert(1)" }, { photoUrl: "https://user:pass@example.test/a.png" }, { active: "false" }, { adminId: "attacker" }, { experience: 71 }, { vehicle: { brand: "Brand", model: "Model", year: 2024, passengers: 0 } }]) {
    assert.equal(driverSchema.safeParse({ ...driver, ...change }).success, false);
  }
  assert.equal(loginSchema.parse({ username: " ADMIN ", password: "value" }).username, "admin");
  assert.equal(loginSchema.safeParse({ username: "admin", password: "value", active: true }).success, false);
});

test("la vCard escapa saltos de línea y pliega por bytes sin romper Unicode", () => {
  assert.equal(escapeVcard("A;B,C\\D\r\nTEL:evil"), "A\\;B\\,C\\\\D\\nTEL:evil");
  const description = "á🚘".repeat(50) + "\r\nTEL:evil";
  const card = contactVcard({ name: "Nombre;Apellido", description, whatsapp: "+50760000000" }, "https://example.test/conductor/prueba");
  assert.ok(card.endsWith("END:VCARD\r\n"));
  assert.ok(card.includes("TEL;TYPE=CELL:+50760000000"));
  assert.ok(!card.includes("\r\nTEL:evil"));
  for (const line of card.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  assert.ok(card.replace(/\r\n /g, "").includes(`NOTE:${escapeVcard(description)}`));
});
