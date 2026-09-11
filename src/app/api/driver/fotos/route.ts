import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi, HttpError, json } from "@/lib/http";
import { limitRequests } from "@/lib/request-limit";
import { limitedBody, MAX_PHOTO_BYTES, MAX_PHOTOS, normalizedPhoto, storePhoto, removePhoto } from "@/lib/photo-storage";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleApi(async () => {
    assertOrigin(request); const actor = await requireApiDriver();
    await limitRequests("photos", [{ value: actor.userId, limit: 40 }]);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new HttpError(415, "Selecciona una fotografía.");
    let form: FormData;
    try { form = await new Response(await limitedBody(request, MAX_PHOTO_BYTES + 8192), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
    catch { throw new HttpError(413, "La foto debe pesar menos de 8 MB."); }
    const file = form.get("file"), caption = String(form.get("caption") || "").trim(), category = form.get("category");
    if (!(file instanceof File) || !caption || caption.length > 160 || !["TRIP", "VEHICLE"].includes(String(category)) || form.get("consent") !== "yes") throw new HttpError(400, "Añade una foto, una descripción y confirma que puedes publicarla.");
    let photo;
    try { photo = await normalizedPhoto(new Uint8Array(await file.arrayBuffer())); } catch (error) { throw new HttpError(400, (error as Error).message); }
    const storageKey = await storePhoto(photo.bytes);
    try {
      const created = await db().$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${actor.driverId} FOR UPDATE`;
        if (await tx.driverPhoto.count({ where: { driverId: actor.driverId } }) >= MAX_PHOTOS) throw new HttpError(409, `Puedes guardar hasta ${MAX_PHOTOS} fotos. Elimina una para añadir otra.`);
        const max = await tx.driverPhoto.aggregate({ where: { driverId: actor.driverId }, _max: { position: true } });
        return tx.driverPhoto.create({ data: { driverId: actor.driverId, category: category as "TRIP" | "VEHICLE", caption, storageKey, width: photo.width, height: photo.height, position: (max._max.position ?? -1) + 1 }, select: { id: true } });
      });
      return json(created, 201);
    } catch (error) { await removePhoto(storageKey); throw error; }
  });
}
