import assert from "node:assert/strict";
import test from "node:test";
import { serviceAvailable, serviceEnd, renewalEnd, serviceExpiringSoon } from "../../src/lib/subscription";
test("365 días exactos incluso al cruzar un año bisiesto", () => {
  const start = new Date("2028-01-01T05:00:00Z");
  assert.equal(serviceEnd(start).toISOString(), "2028-12-31T05:00:00.000Z");
  assert.equal(start.toISOString(), "2028-01-01T05:00:00.000Z");
});
test("el instante de vencimiento y la fecha futura bloquean; cuentas pendientes se conservan", () => {
  const start = new Date("2026-10-15T05:00:00Z"), end = serviceEnd(start);
  assert.equal(serviceAvailable({ serviceStartsAt: start, serviceExpiresAt: end }, new Date(start.getTime() - 1)), false);
  assert.equal(serviceAvailable({ serviceStartsAt: start, serviceExpiresAt: end }, start), true);
  assert.equal(serviceAvailable({ serviceExpiresAt: end }, new Date(end.getTime() - 1)), true);
  assert.equal(serviceAvailable({ serviceExpiresAt: end }, end), false);
  assert.equal(serviceAvailable({ serviceStartsAt: null, serviceExpiresAt: null }, end), true);
});
test("renovar antes conserva días; después comienza al pagar", () => {
  const now = new Date("2026-10-15T05:00:00Z"), future = new Date("2026-12-01T05:00:00Z");
  assert.equal(renewalEnd(future, now).getTime(), serviceEnd(future).getTime());
  assert.equal(renewalEnd(new Date(now.getTime() - 1), now).getTime(), serviceEnd(now).getTime());
  assert.equal(renewalEnd(now, now).getTime(), serviceEnd(now).getTime());
});

test("el aviso de renovación aparece únicamente durante los últimos 30 días", () => {
  const now = new Date("2026-10-16T05:00:00Z");
  const day = 86_400_000;
  assert.equal(serviceExpiringSoon(new Date(now.getTime() + 365 * day), now), false);
  assert.equal(serviceExpiringSoon(new Date(now.getTime() + 30 * day + 1), now), false);
  assert.equal(serviceExpiringSoon(new Date(now.getTime() + 30 * day), now), true);
  assert.equal(serviceExpiringSoon(new Date(now.getTime() + 1), now), true);
  assert.equal(serviceExpiringSoon(now, now), false);
  assert.equal(serviceExpiringSoon(new Date(now.getTime() - 1), now), false);
});
