import "server-only";
import { db } from "./db";
import { HttpError, json } from "./http";
import { limitRequests } from "./request-limit";
import { limitedBody, MAX_PHOTO_BYTES, normalizedPhoto, storePhoto } from "./photo-storage";
import { discardProfilePhoto } from "./profile-photo";

// La sesión, el propietario y el origen se resuelven en cada controlador.
export async function saveServicePhoto(request: Request, driverId: string, serviceId: string, bucket: string) {
  if (driverId.length > 191 || serviceId.length > 191) throw new HttpError(404, "No se encontró el servicio.");
  await limitRequests("service-photos", [{ value: bucket, limit: 40 }]);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new HttpError(415, "Selecciona una fotografía.");
  let form: FormData;
  try { form = await new Response(await limitedBody(request, MAX_PHOTO_BYTES + 8192), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new HttpError(413, "La foto debe pesar menos de 8 MB."); }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || form.get("consent") !== "yes") throw new HttpError(400, "Selecciona una foto y confirma que puedes publicarla.");
  let photo;
  try { photo = await normalizedPhoto(new Uint8Array(await file.arrayBuffer())); }
  catch (error) { throw new HttpError(400, (error as Error).message); }
  const storageKey = await storePhoto(photo.bytes);
  let previousKey: string | null;
  try {
    previousKey = await db().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
      const service = await tx.service.findFirst({ where: { id: serviceId, active: true, drivers: { some: { id: driverId } } }, select: { id: true } });
      if (!service) throw new HttpError(404, "Este servicio no está disponible en el perfil. Guarda primero los servicios del conductor.");
      const where = { driverId_serviceId: { driverId, serviceId } };
      const previous = await tx.driverServicePhoto.findUnique({ where, select: { storageKey: true } });
      const data = { storageKey, width: photo.width, height: photo.height };
      await tx.driverServicePhoto.upsert({ where, create: { ...data, driverId, serviceId }, update: data });
      return previous?.storageKey || null;
    });
  } catch (error) { await discardProfilePhoto(storageKey); throw error; }
  await discardProfilePhoto(previousKey);
  return json({ ok: true });
}

export async function deleteServicePhoto(driverId: string, serviceId: string) {
  if (driverId.length > 191 || serviceId.length > 191) throw new HttpError(404, "No se encontró el servicio.");
  const key = await db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
    const photo = await tx.driverServicePhoto.findUnique({ where: { driverId_serviceId: { driverId, serviceId } } });
    if (!photo) throw new HttpError(404, "No se encontró la foto del servicio.");
    await tx.driverServicePhoto.delete({ where: { id: photo.id } });
    return photo.storageKey;
  });
  await discardProfilePhoto(key);
  return json({ ok: true });
}
