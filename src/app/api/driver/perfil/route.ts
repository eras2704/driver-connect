import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { driverProfileSchema } from "@/lib/booking-validation";
import { fieldErrors } from "@/lib/validation";
import { limitRequests } from "@/lib/request-limit";
import { limitedBody, MAX_PHOTO_BYTES, MAX_PHOTOS, normalizedPhoto, removePhoto, storePhoto } from "@/lib/photo-storage";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const actor = await requireApiDriver(); assertOrigin(request);
    let body: unknown;
    let file: File | null = null;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
      await limitRequests("photos", [{ value: actor.userId, limit: 40 }]);
      let form: FormData;
      try {
        const bytes = await limitedBody(request, MAX_PHOTO_BYTES + 65_536);
        form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
      } catch { throw new HttpError(413, "No se pudo leer la foto. Usa una imagen de hasta 8 MB."); }
      const profile = form.get("profile"), candidate = form.get("vehiclePhoto");
      if (typeof profile !== "string" || Buffer.byteLength(profile) > 32_768) throw new HttpError(400, "Revisa los datos del perfil.");
      try { body = JSON.parse(profile); } catch { throw new HttpError(400, "Revisa los datos del perfil."); }
      if (!(candidate instanceof File) || !candidate.size || form.get("consent") !== "yes") {
        throw new HttpError(400, "Selecciona una foto y confirma que puedes publicarla.", { vehiclePhoto: "Selecciona una foto y confirma el permiso para publicarla." });
      }
      file = candidate;
    } else body = await readJson(request);

    const parsed = driverProfileSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Revisa los campos del perfil.", fieldErrors(parsed.error));
    const input = parsed.data;
    if (file && !input.vehicle) throw new HttpError(400, "Incluye un vehículo para guardar su fotografía.");
    let photo: Awaited<ReturnType<typeof normalizedPhoto>> | null = null;
    if (file) {
      try { photo = await normalizedPhoto(new Uint8Array(await file.arrayBuffer())); }
      catch (error) {
        const message = (error as Error).message;
        throw new HttpError(400, message, { vehiclePhoto: message });
      }
    }
    const storageKey = photo ? await storePhoto(photo.bytes) : null;
    try {
      await db().$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${actor.driverId} FOR UPDATE`;
        if (await tx.service.count({ where: { id: { in: input.serviceIds }, active: true } }) !== input.serviceIds.length) throw new HttpError(400, "Uno de los servicios no está disponible.");
        if (photo && storageKey && input.vehicle) {
          if (await tx.driverPhoto.count({ where: { driverId: actor.driverId } }) >= MAX_PHOTOS) throw new HttpError(409, `Puedes guardar hasta ${MAX_PHOTOS} fotos. Elimina una en Mis fotos para añadir otra.`);
          const first = await tx.driverPhoto.aggregate({ where: { driverId: actor.driverId }, _min: { position: true } });
          // La primera foto de vehículo es también la portada pública; las anteriores se conservan.
          await tx.driverPhoto.create({ data: { driverId: actor.driverId, category: "VEHICLE", caption: `${input.vehicle.brand} ${input.vehicle.model}`.slice(0, 160), storageKey, width: photo.width, height: photo.height, position: (first._min.position ?? 1) - 1 } });
        }
        await tx.driver.update({ where: { id: actor.driverId }, data: { name: input.name, phone: input.phone || null, whatsapp: input.whatsapp || null, email: input.email || null, location: input.location || null, experience: input.experience, description: input.description || null, photoUrl: input.photoUrl || null, languages: input.languages, services: { set: input.serviceIds.map(id => ({ id })) } } });
        const existing = await tx.vehicle.findFirst({ where: { driverId: actor.driverId }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], select: { id: true } });
        if (input.vehicle) {
          if (existing) await tx.vehicle.update({ where: { id: existing.id }, data: { ...input.vehicle, active: true } });
          else await tx.vehicle.create({ data: { ...input.vehicle, driverId: actor.driverId, active: true } });
        } else await tx.vehicle.updateMany({ where: { driverId: actor.driverId }, data: { active: false } });
      });
    } catch (error) {
      if (storageKey) {
        try { await removePhoto(storageKey); } catch { console.error("No se pudo retirar una foto que no llegó a guardarse en el perfil."); }
      }
      throw error;
    }
    return json({ ok: true });
  });
}
