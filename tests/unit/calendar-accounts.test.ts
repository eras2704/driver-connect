import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "../../src/lib/cloud-calendar/crypto";
import { eventBody, writeEvent, CalendarError } from "../../src/lib/cloud-calendar/providers";
import { parsePanamaDate, type CalendarTrip } from "../../src/lib/calendar";
const trip: CalendarTrip = { id: "trip", serviceName: "Aeropuerto", pickup: "Hotel <script>", destination: "Tocumen", startsAt: parsePanamaDate("2026-10-12T08:30"), endsAt: parsePanamaDate("2026-10-12T09:30"), status: "CONFIRMED", version: 1, updatedAt: new Date() };
test("tokens cifrados con autenticación y ligados a su conexión", () => {
  const previous = process.env.CALENDAR_TOKEN_KEY; process.env.CALENDAR_TOKEN_KEY = randomBytes(32).toString("hex");
  try { const sealed = encrypt("secret-refresh-token", "connection-a"); assert.ok(!sealed.includes("secret-refresh-token")); assert.equal(decrypt(sealed, "connection-a"), "secret-refresh-token"); assert.throws(() => decrypt(sealed, "connection-b")); assert.throws(() => decrypt(sealed.slice(1), "connection-a")); } finally { if (previous) process.env.CALENDAR_TOKEN_KEY = previous; else delete process.env.CALENDAR_TOKEN_KEY; }
});
test("payloads de calendario no contienen datos privados ni invitados y conservan la hora", () => {
  const extra = { ...trip, customerName: "PRIVATE NAME", phone: "PRIVATE PHONE", email: "PRIVATE EMAIL", notes: "PRIVATE NOTES" };
  for (const provider of ["GOOGLE", "MICROSOFT"] as const) { const body = eventBody(provider, extra), serialized = JSON.stringify(body); for (const value of [extra.customerName, extra.phone, extra.email, extra.notes, "attendees", "refresh_token"]) assert.ok(!serialized.includes(value)); assert.ok(serialized.includes("2026-10-12T13:30:00.000")); }
  assert.ok(JSON.stringify(eventBody("GOOGLE", trip)).includes("&lt;script&gt;"));
});
test("reintentos del proveedor conservan identidad y las cancelaciones son idempotentes", async t => {
  const calls: { url: string; method: string; body: Record<string, unknown> }[] = [], replies: Response[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => { calls.push({ url, method: init.method || "GET", body: init.body ? JSON.parse(String(init.body)) : {} }); const response = replies.shift(); assert.ok(response, "Petición externa inesperada"); return response; });
  const map = { operationId: "f264d626-b21a-43ce-9a45-ab444fb66a03", externalId: null };
  replies.push(new Response("{}", { status: 409 }), Response.json({ id: "existing" }));
  const id = await writeEvent("GOOGLE", "fake", trip, map); assert.equal(id, "dcf264d626b21a43ce9a45ab444fb66a03"); assert.deepEqual(calls.map(c => c.method), ["POST", "PATCH"]); assert.equal(calls[0].body.id, id);
  replies.push(new Response(null, { status: 404 })); await writeEvent("GOOGLE", "fake", { ...trip, status: "CANCELLED" }, { ...map, externalId: id }); assert.equal(calls.at(-1)?.method, "DELETE");
  replies.push(Response.json({ value: [{ id: "recovered-ms" }] }), Response.json({}));
  assert.equal(await writeEvent("MICROSOFT", "fake", trip, map), "recovered-ms"); assert.ok(calls.at(-2)?.url.includes("singleValueExtendedProperties")); assert.equal(calls.at(-1)?.method, "PATCH");
  replies.push(Response.json({ value: [] }), Response.json({ id: "new-ms" }));
  await writeEvent("MICROSOFT", "fake", trip, map); assert.equal(calls.at(-1)?.body.transactionId, map.operationId); assert.ok(calls.at(-1)?.body.singleValueExtendedProperties);
  replies.push(new Response(null, { status: 429, headers: { "retry-after": "120" } })); await assert.rejects(writeEvent("GOOGLE", "fake", trip, map), (e: unknown) => e instanceof CalendarError && e.code === "RETRY" && e.retryAfter === 120000);
});
