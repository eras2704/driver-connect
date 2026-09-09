import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { driverProfileSchema } from "@/lib/booking-validation";
import { fieldErrors } from "@/lib/validation";
export async function PATCH(request: Request) {
  return handleApi(async () => {
    const actor = await requireApiDriver(); assertOrigin(request);
    const parsed = driverProfileSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa los campos del perfil.", fieldErrors(parsed.error));
    const input = parsed.data;
    await db().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${actor.driverId} FOR UPDATE`;
      if (await tx.service.count({ where: { id: { in: input.serviceIds }, active: true } }) !== input.serviceIds.length) throw new HttpError(400, "Uno de los servicios no está disponible.");
      await tx.driver.update({ where: { id: actor.driverId }, data: { name: input.name, phone: input.phone || null, whatsapp: input.whatsapp || null, email: input.email || null, location: input.location || null, experience: input.experience, description: input.description || null, photoUrl: input.photoUrl || null, languages: input.languages, services: { set: input.serviceIds.map(id => ({ id })) } } });
      const existing = await tx.vehicle.findFirst({ where: { driverId: actor.driverId }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], select: { id: true } });
      if (input.vehicle) {
        if (existing) await tx.vehicle.update({ where: { id: existing.id }, data: { ...input.vehicle, active: true } });
        else await tx.vehicle.create({ data: { ...input.vehicle, driverId: actor.driverId, active: true } });
      } else await tx.vehicle.updateMany({ where: { driverId: actor.driverId }, data: { active: false } });
    });
    return json({ ok: true });
  });
}
