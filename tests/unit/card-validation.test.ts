import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { cardOperationSchema } from "../../src/lib/card-validation";

test("card stock requires explicit upgrade, return and NFC confirmations", () => {
  assert.equal(cardOperationSchema.safeParse({ action: "prepare", requestId: randomUUID(), reference: "Pedido 123", normalConfirmed: true }).success, true);
  assert.equal(cardOperationSchema.safeParse({ action: "prepare", requestId: randomUUID(), reference: "Pedido 123" }).success, false);
  const complete = { action: "complete", requestId: randomUUID(), upgradeId: randomUUID(), premiumTested: true, normalReturned: true };
  assert.equal(cardOperationSchema.safeParse(complete).success, true);
  for (const key of ["premiumTested", "normalReturned"]) {
    assert.equal(cardOperationSchema.safeParse({ ...complete, [key]: false }).success, false);
    assert.equal(cardOperationSchema.safeParse({ ...complete, [key]: undefined }).success, false);
  }
  const assign = { action: "assign", requestId: randomUUID(), slug: "tarjeta-normal", reference: "Entrega 123", nfcRewritten: true };
  assert.equal(cardOperationSchema.safeParse(assign).success, true);
  assert.equal(cardOperationSchema.safeParse({ ...assign, nfcRewritten: false }).success, false);
  assert.equal(cardOperationSchema.safeParse({ ...assign, driverId: "someone-else" }).success, false);
  assert.equal(cardOperationSchema.safeParse({ ...assign, slug: "../admin" }).success, false);
  assert.equal(cardOperationSchema.safeParse({ action: "prepare", requestId: randomUUID(), reference: " " }).success, false);
});
