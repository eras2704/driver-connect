import sharp from "sharp";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
export const MAX_PHOTOS = 24;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export async function normalizedPhoto(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error("La foto debe pesar menos de 8 MB.");
  try {
    const input = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
    const meta = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages ?? 1) > 1) throw new Error();
    const { data, info } = await input.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
    return { bytes: data, width: info.width, height: info.height };
  } catch { throw new Error("Usa una foto JPG, PNG o WebP válida, de hasta 40 megapíxeles. En iPhone puedes elegir el formato Más compatible (JPG)."); }
}
function photoPath(key: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw new Error("Identificador de fotografía inválido.");
  return join(resolve(process.env.UPLOAD_DIR || "./data/uploads"), key);
}
export async function storePhoto(bytes: Uint8Array) {
  const key = `${randomUUID()}.webp`, path = photoPath(key);
  await mkdir(resolve(process.env.UPLOAD_DIR || "./data/uploads"), { recursive: true, mode: 0o750 });
  await writeFile(path, bytes, { flag: "wx", mode: 0o640 }); return key;
}
export const loadPhoto = (key: string) => readFile(photoPath(key));
export async function removePhoto(key: string) { try { await unlink(photoPath(key)); } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error; } }
export async function limitedBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length")) > limit) throw new Error("SIZE");
  const reader = request.body?.getReader(); if (!reader) throw new Error("EMPTY");
  const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > limit) { await reader.cancel(); throw new Error("SIZE"); } chunks.push(value); } } finally { reader.releaseLock(); }
  const body = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; } return body;
}
