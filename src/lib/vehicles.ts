import "server-only";
import { z } from "zod";
import { db } from "./db";
import { driverSchema, fieldErrors } from "./validation";
import { HttpError, json, readJson } from "./http";
import { readProfileRequest, withProfilePhotos, discardProfilePhoto } from "./profile-photo";
const schema = driverSchema.shape.vehicle.unwrap().extend({ id: z.string().max(191).optional(), updatedAt: z.iso.datetime().optional() }).strict();
export const MAX_VEHICLES = 10;
export async function saveVehicle(request: Request, driverId: string) {
  const { body, files } = await readProfileRequest(request, `vehicle:${driverId}`);
  if (files.driver) throw new HttpError(400, "Selecciona únicamente la foto del vehículo.");
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "Revisa los datos del vehículo.", fieldErrors(parsed.error));
  const { id, updatedAt, ...data } = parsed.data;
  const saved = await withProfilePhotos(files, data, photos => db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
    if (!await tx.driver.findUnique({ where: { id: driverId }, select: { id: true } })) throw new HttpError(404, "No se encontró el conductor.");
    const existing = id ? await tx.vehicle.findFirst({ where: { id, driverId, active: true } }) : null;
    if (id && !existing) throw new HttpError(404, "No se encontró el vehículo.");
    if (existing && (!updatedAt || existing.updatedAt.getTime() !== new Date(updatedAt).getTime())) throw new HttpError(409, "El vehículo cambió. Recarga la página antes de guardar.");
    if (!existing && await tx.vehicle.count({ where: { driverId, active: true } }) >= MAX_VEHICLES) throw new HttpError(409, `Puedes publicar hasta ${MAX_VEHICLES} vehículos.`);
    const values = { ...data, active: true, ...(photos.vehicle ? { photoStorageKey: photos.vehicle.storageKey } : {}) };
    const vehicle = existing ? await tx.vehicle.update({ where: { id: existing.id }, data: values }) : await tx.vehicle.create({ data: { ...values, driverId } });
    await tx.driver.update({ where: { id: driverId }, data: { updatedAt: new Date() } });
    return { vehicle, oldKey: photos.vehicle ? existing?.photoStorageKey ?? null : null };
  }));
  await discardProfilePhoto(saved.oldKey);
  return json({ ok: true, id: saved.vehicle.id });
}
export async function removeVehicle(request: Request, driverId: string) {
  const parsed = z.object({ id: z.string().min(1).max(191), updatedAt: z.iso.datetime() }).strict().safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, "Revisa el vehículo seleccionado.");
  await db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
    const result = await tx.vehicle.updateMany({ where: { id: parsed.data.id, driverId, active: true, updatedAt: new Date(parsed.data.updatedAt) }, data: { active: false } });
    if (!result.count) throw new HttpError(409, "El vehículo cambió o ya fue retirado. Recarga la página.");
    await tx.driver.update({ where: { id: driverId }, data: { updatedAt: new Date() } });
  });
  return json({ ok: true });
}
