import assert from "node:assert/strict";
import test from "node:test";
import { publicHeadline, DEFAULT_HEADLINE_ES, DEFAULT_HEADLINE_EN } from "../../src/lib/profile-headline";
import { driverSchema } from "../../src/lib/validation";
import { driverProfileSchema } from "../../src/lib/booking-validation";

test("el mensaje usa el predeterminado, la personalización o su traducción sin perder el texto del conductor", () => {
  assert.equal(publicHeadline({}), DEFAULT_HEADLINE_ES);
  assert.equal(publicHeadline({ headline: null }, "en"), DEFAULT_HEADLINE_EN);
  assert.equal(publicHeadline({ headline: "   " }, "es"), DEFAULT_HEADLINE_ES);
  assert.equal(publicHeadline({ headline: " Viaja a tu ritmo " }), "Viaja a tu ritmo");
  assert.equal(publicHeadline({ headline: "Viaja a tu ritmo" }, "en"), "Viaja a tu ritmo");
  assert.equal(publicHeadline({ headline: "Viaja a tu ritmo", headlineEn: " Travel your way " }, "en"), "Travel your way");
});

test("ambos paneles limitan el mensaje y distinguen omitirlo de restaurar el predeterminado", () => {
  const input = { name: "Conductor prueba", slug: "conductor-prueba", active: true, verified: false, experience: 3, languages: [], serviceIds: [], vehicle: null };
  assert.equal(driverSchema.parse(input).headline, undefined);
  assert.equal(driverSchema.parse({ ...input, headline: " " }).headline, "");
  assert.equal(driverSchema.parse({ ...input, headline: "Tu viaje\n  a tu ritmo" }).headline, "Tu viaje a tu ritmo");
  const own = { name: input.name, experience: 3, languages: [], serviceIds: [], vehicle: null };
  for (const schema of [driverSchema, driverProfileSchema]) {
    const profile = schema === driverSchema ? input : own;
    assert.equal(schema.safeParse({ ...profile, headline: "a".repeat(120) }).success, true);
    assert.equal(schema.safeParse({ ...profile, headline: "a".repeat(121) }).success, false);
    assert.equal(schema.safeParse({ ...profile, headlineEn: "a".repeat(121) }).success, false);
    assert.equal(schema.safeParse({ ...profile, headline: { html: "bad" } }).success, false);
  }
});
