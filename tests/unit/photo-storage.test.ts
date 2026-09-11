import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { normalizedPhoto, limitedBody, MAX_PHOTO_BYTES } from "../../src/lib/photo-storage";
test("fotografías se orientan, reducen y publican sin EXIF ni contenido ejecutable", async () => {
  const input = await sharp({ create: { width: 2600, height: 1300, channels: 3, background: "#285c85" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await normalizedPhoto(input), meta = await sharp(result.bytes).metadata();
  assert.equal(result.width, 1000); assert.equal(result.height, 2000); assert.equal(meta.format, "webp"); assert.equal(meta.exif, undefined); assert.equal(meta.orientation, undefined);
  await assert.rejects(normalizedPhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')));
  await assert.rejects(normalizedPhoto(Buffer.from("not an image")));
  await assert.rejects(normalizedPhoto(new Uint8Array(MAX_PHOTO_BYTES + 1)));
});
test("límite de carga se aplica incluso sin Content-Length", async () => {
  const request = new Request("https://example.test", { method: "POST", body: new Uint8Array(12) });
  await assert.rejects(limitedBody(request, 10));
  assert.equal((await limitedBody(new Request("https://example.test", { method: "POST", body: "small" }), 10)).length, 5);
});
