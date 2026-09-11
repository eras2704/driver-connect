import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { HttpError, readJson } from "./http";
import { limitRequests } from "./request-limit";
import { limitedBody, MAX_PHOTO_BYTES, MAX_PHOTOS, normalizedPhoto, removePhoto, storePhoto } from "./photo-storage";

// Los controladores deben validar sesión y origen antes de leer el archivo.
export async function readProfileRequest(request: Request, uploadBucket: string): Promise<{ body: unknown; file: File | null }> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) return { body: await readJson(request), file: null };
  await limitRequests("photos", [{ value: uploadBucket, limit: 40 }]);
  let form: FormData;
  try {
    const bytes = await limitedBody(request, MAX_PHOTO_BYTES + 65_536);
    form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
  } catch { throw new HttpError(413, "No se pudo leer la foto. Usa una imagen de hasta 8 MB."); }
  const profile = form.get("profile"), file = form.get("vehiclePhoto");
  if (typeof profile !== "string" || Buffer.byteLength(profile) > 32_768) throw new HttpError(400, "Revisa los datos del perfil.");
  let body: unknown;
  try { body = JSON.parse(profile); } catch { throw new HttpError(400, "Revisa los datos del perfil."); }
  if (!(file instanceof File) || !file.size || form.get("consent") !== "yes") {
    throw new HttpError(400, "Selecciona una foto y confirma que puedes publicarla.", { vehiclePhoto: "Selecciona una foto y confirma el permiso para publicarla." });
  }
  return { body, file };
}

type PreparedPhoto = { storageKey: string; width: number; height: number; caption: string };

// El archivo sólo se conserva si la transacción del perfil termina correctamente.
export async function withVehiclePhoto<T>(file: File | null, vehicle: { brand: string; model: string } | null, save: (photo: PreparedPhoto | null) => Promise<T>): Promise<T> {
  if (!file) return save(null);
  if (!vehicle) throw new HttpError(400, "Incluye un vehículo para guardar su fotografía.");
  let photo: Awaited<ReturnType<typeof normalizedPhoto>>;
  try { photo = await normalizedPhoto(new Uint8Array(await file.arrayBuffer())); }
  catch (error) {
    const message = (error as Error).message;
    throw new HttpError(400, message, { vehiclePhoto: message });
  }
  const storageKey = await storePhoto(photo.bytes);
  try {
    return await save({ storageKey, width: photo.width, height: photo.height, caption: `${vehicle.brand} ${vehicle.model}`.slice(0, 160) });
  } catch (error) {
    try { await removePhoto(storageKey); } catch { console.error("No se pudo retirar una foto que no llegó a guardarse en el perfil."); }
    throw error;
  }
}

// La fila del conductor debe estar bloqueada (o recién creada) en esta transacción.
export async function addVehiclePhoto(tx: Prisma.TransactionClient, driverId: string, photo: PreparedPhoto | null) {
  if (!photo) return;
  if (await tx.driverPhoto.count({ where: { driverId } }) >= MAX_PHOTOS) throw new HttpError(409, `Puedes guardar hasta ${MAX_PHOTOS} fotos. Elimina una foto de la galería para añadir otra.`);
  const first = await tx.driverPhoto.aggregate({ where: { driverId }, _min: { position: true } });
  // La primera foto de vehículo es también la portada pública; las anteriores se conservan.
  await tx.driverPhoto.create({ data: { ...photo, driverId, category: "VEHICLE", position: (first._min.position ?? 1) - 1 } });
}
