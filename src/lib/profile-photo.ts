import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { HttpError, readJson } from "./http";
import { limitRequests } from "./request-limit";
import { limitedBody, MAX_PHOTO_BYTES, MAX_PHOTOS, normalizedPhoto, removePhoto, storePhoto } from "./photo-storage";

// Los controladores deben validar sesión y origen antes de leer el archivo.
export type ProfileFiles = { vehicle: File | null; driver: File | null };
export async function readProfileRequest(request: Request, uploadBucket: string): Promise<{ body: unknown; files: ProfileFiles }> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) return { body: await readJson(request), files: { vehicle: null, driver: null } };
  await limitRequests("photos", [{ value: uploadBucket, limit: 40 }]);
  let form: FormData;
  try {
    const bytes = await limitedBody(request, 2 * MAX_PHOTO_BYTES + 65_536);
    form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
  } catch { throw new HttpError(413, "No se pudieron leer las fotos. Usa imágenes de hasta 8 MB cada una."); }
  const profile = form.get("profile");
  if (typeof profile !== "string" || Buffer.byteLength(profile) > 32_768) throw new HttpError(400, "Revisa los datos del perfil.");
  let body: unknown;
  try { body = JSON.parse(profile); } catch { throw new HttpError(400, "Revisa los datos del perfil."); }
  const readFile = (name: string, consent: string) => {
    const file = form.get(name);
    if (file === null) return null;
    if (!(file instanceof File) || !file.size || form.get(consent) !== "yes") throw new HttpError(400, "Selecciona una foto y confirma que puedes publicarla.", { [name]: "Selecciona una foto y confirma el permiso para publicarla." });
    return file;
  };
  const files = { vehicle: readFile("vehiclePhoto", "consent"), driver: readFile("driverPhoto", "driverConsent") };
  if (!files.vehicle && !files.driver) throw new HttpError(400, "Selecciona una fotografía.");
  return { body, files };
}

type StoredPhoto = { storageKey: string; width: number; height: number };
type PreparedPhoto = StoredPhoto & { caption: string };
type ProfilePhotos = { vehicle: PreparedPhoto | null; driver: StoredPhoto | null };

// Ambos archivos se conservan sólo si la transacción del perfil termina correctamente.
export async function withProfilePhotos<T>(files: ProfileFiles, vehicle: { brand: string; model: string } | null, save: (photos: ProfilePhotos) => Promise<T>): Promise<T> {
  if (files.vehicle && !vehicle) throw new HttpError(400, "Incluye un vehículo para guardar su fotografía.");
  const stagedKeys: string[] = [];
  async function prepare(file: File | null, field: string): Promise<StoredPhoto | null> {
    if (!file) return null;
    let photo: Awaited<ReturnType<typeof normalizedPhoto>>;
    try { photo = await normalizedPhoto(new Uint8Array(await file.arrayBuffer())); }
    catch (error) {
      const message = (error as Error).message;
      throw new HttpError(400, message, { [field]: message });
    }
    const storageKey = await storePhoto(photo.bytes);
    stagedKeys.push(storageKey);
    return { storageKey, width: photo.width, height: photo.height };
  }
  try {
    const driverPhoto = await prepare(files.driver, "driverPhoto");
    const vehiclePhoto = await prepare(files.vehicle, "vehiclePhoto");
    return await save({ driver: driverPhoto, vehicle: vehiclePhoto && vehicle ? { ...vehiclePhoto, caption: `${vehicle.brand} ${vehicle.model}`.slice(0, 160) } : null });
  } catch (error) {
    for (const key of stagedKeys) await discardProfilePhoto(key);
    throw error;
  }
}

export async function discardProfilePhoto(key: string | null) {
  if (!key) return;
  try { await removePhoto(key); } catch { console.error("No se pudo retirar una fotografía del almacenamiento."); }
}

export async function replaceDriverPortrait(tx: Prisma.TransactionClient, driverId: string, photo: StoredPhoto | null) {
  if (!photo) return null;
  const previous = await tx.driver.findUniqueOrThrow({ where: { id: driverId }, select: { portraitStorageKey: true } });
  await tx.driver.update({ where: { id: driverId }, data: { portraitStorageKey: photo.storageKey } });
  return previous.portraitStorageKey;
}

// La fila del conductor debe estar bloqueada (o recién creada) en esta transacción.
export async function addVehiclePhoto(tx: Prisma.TransactionClient, driverId: string, photo: PreparedPhoto | null) {
  if (!photo) return;
  if (await tx.driverPhoto.count({ where: { driverId } }) >= MAX_PHOTOS) throw new HttpError(409, `Puedes guardar hasta ${MAX_PHOTOS} fotos. Elimina una foto de la galería para añadir otra.`);
  const first = await tx.driverPhoto.aggregate({ where: { driverId }, _min: { position: true } });
  // La primera foto de vehículo es también la portada pública; las anteriores se conservan.
  await tx.driverPhoto.create({ data: { ...photo, driverId, category: "VEHICLE", position: (first._min.position ?? 1) - 1 } });
}
