import "server-only";
import { z } from "zod";
import { db } from "./db";
import { fieldErrors } from "./validation";
import { HttpError, json, readJson } from "./http";
import { readProfileRequest, withProfilePhotos, discardProfilePhoto } from "./profile-photo";
export const customServiceSchema = z.object({ id: z.string().max(191).optional(), updatedAt: z.iso.datetime().optional(), name: z.string().trim().min(2).max(191), nameEn: z.string().trim().max(191).default(""), description: z.string().trim().max(1000).default(""), descriptionEn: z.string().trim().max(1000).default("") }).strict();
export async function saveCustomService(request: Request, driverId: string) {
  const { body, files } = await readProfileRequest(request, `service:${driverId}`);
  if (files.driver) throw new HttpError(400, "Selecciona únicamente la foto del servicio.");
  const parsed = customServiceSchema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "Revisa el servicio.", fieldErrors(parsed.error));
  const { id, updatedAt, ...data } = parsed.data;
  const result = await withProfilePhotos(files, { brand: data.name, model: "" }, photos => db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
    const driver = await tx.driver.findUnique({ where: { id: driverId }, select: { id: true, customServicesEnabled: true } });
    if (!driver) throw new HttpError(404, "No se encontró el conductor.");
    const existing = id ? await tx.profileService.findFirst({ where: { id, driverId, active: true } }) : null;
    if (id && !existing) throw new HttpError(404, "No se encontró el servicio.");
    if (existing && (!updatedAt || existing.updatedAt.getTime() !== new Date(updatedAt).getTime())) throw new HttpError(409, "Este servicio cambió. Recarga antes de guardar.");
    if (!existing && await tx.profileService.count({ where: { driverId, active: true } }) >= 5) throw new HttpError(409, "Puedes publicar un máximo de cinco servicios propios.");
    const values = { ...data, ...(photos.vehicle ? { photoStorageKey: photos.vehicle.storageKey } : {}) };
    const service = existing ? await tx.profileService.update({ where: { id: existing.id }, data: values }) : await tx.profileService.create({ data: { ...values, driverId } });
    await tx.driver.update({ where: { id: driverId }, data: { customServicesEnabled: true, updatedAt: new Date() } });
    return { id: service.id, oldKey: photos.vehicle ? existing?.photoStorageKey ?? null : null };
  }));
  await discardProfilePhoto(result.oldKey);
  return json({ ok: true, id: result.id });
}
export async function removeCustomService(request: Request, driverId: string) {
  const parsed = z.object({ id: z.string().min(1).max(191), updatedAt: z.iso.datetime() }).strict().safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, "Servicio inválido.");
  await db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
    const updated = await tx.profileService.updateMany({ where: { id: parsed.data.id, driverId, active: true, updatedAt: new Date(parsed.data.updatedAt) }, data: { active: false } });
    if (!updated.count) throw new HttpError(409, "El servicio cambió o ya fue retirado. Recarga la página.");
    await tx.driver.update({ where: { id: driverId }, data: { customServicesEnabled: true, updatedAt: new Date() } });
  });
  return json({ ok: true });
}
