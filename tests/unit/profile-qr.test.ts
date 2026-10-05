import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { profileQr } from "../../src/lib/profile-qr";

test("QR exports use the permanent public URL and print on an opaque white background", async () => {
  const qr = await profileQr("https://drivers.example", "ana-perez");
  assert.equal(qr.url, "https://drivers.example/conductor/ana-perez");
  const png = Buffer.from(qr.png.split(",")[1], "base64");
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 1200);
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.subarray(0, 4)], [255, 255, 255, 255]);
  const svg = Buffer.from(qr.svg.split(",")[1], "base64").toString();
  assert.match(svg, /<svg/);
  assert.match(svg, /#ffffff/);
  assert.match(svg, /#000000/);
  assert.notEqual(qr.svg, (await profileQr("https://drivers.example", "otro-conductor")).svg);
});

test("invalid profile paths cannot be encoded", async () => {
  await assert.rejects(profileQr("https://drivers.example", "../admin"));
});
