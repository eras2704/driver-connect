import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { detectPublicLanguage, isPublicLanguage, translatePublic } from "../../src/lib/public-locale";
import { publicTranslations } from "../../src/lib/public-translations";
import { publicHeadline } from "../../src/lib/profile-headline";
import { publicBookingError } from "../../src/lib/public-booking-error";

test("detects regional browser languages in order and falls back to English", () => {
  for (const [tag, expected] of [["de-DE", "de"], ["fr-CA", "fr"], ["pt-BR", "pt"], ["es-PA", "es"], ["en-US", "en"]]) {
    assert.equal(detectPublicLanguage([tag]), expected);
  }
  assert.equal(detectPublicLanguage(["ja-JP", "de-CH", "en"]), "de");
  assert.equal(detectPublicLanguage(["zh-CN"]), "en");
  assert.equal(detectPublicLanguage([]), "en");
  assert.equal(isPublicLanguage("DE"), false);
  assert.equal(isPublicLanguage("garbage"), false);
});

test("all bundled public profile, gallery, sharing and reservation copy has translations", () => {
  const files = ["components/public-driver-profile.tsx", "components/theme-control.tsx", "components/gallery/photo-carousel.tsx", "components/share-profile.tsx", "components/booking/trip-form.tsx", "components/booking/public-reservation.tsx"];
  for (const file of files) {
    const source = readFileSync(new URL(`../../src/${file}`, import.meta.url), "utf8");
    for (const match of source.matchAll(/\bt\("[^"\n]*", "([^"\n]*)"\)/g)) {
      assert.ok(publicTranslations[match[1]], `${file}: ${match[1]}`);
      for (const language of ["de", "fr", "pt"] as const) assert.ok(publicTranslations[match[1]][language]);
    }
  }
});

test("preserves driver-authored text and translates the default headline", () => {
  assert.equal(publicHeadline({}, "de"), "Ihr Reiseziel, in guten Händen.");
  assert.equal(publicHeadline({ headline: "Mi mensaje" }, "de"), "Mi mensaje");
  assert.equal(publicHeadline({ headline: "Mi mensaje", headlineEn: "My message" }, "fr"), "My message");
  assert.equal(translatePublic("es", "Reservar", "Request a ride"), "Reservar");
  assert.equal(translatePublic("de", "Texto libre", "Unlisted text"), "Unlisted text");
});

test("booking errors preserve actionable details and localize rate limiting", () => {
  assert.equal(publicBookingError("es", "La cantidad de pasajeros supera la capacidad del vehículo.", 400), "La cantidad de pasajeros supera la capacidad del vehículo.");
  assert.equal(publicBookingError("de", "La cantidad de pasajeros supera la capacidad del vehículo.", 400), "Die Anzahl der Fahrgäste übersteigt die Fahrzeugkapazität.");
  assert.equal(publicBookingError("fr", undefined, 429), "Trop de demandes. Attendez un instant et réessayez.");
  assert.equal(publicBookingError("en", "Unknown server message", 500), "Could not save your trip. Please try again.");
});
