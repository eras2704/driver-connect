import "server-only";
import { db } from "./db";
import { requireAdmin, requireApiAdmin } from "./admin-session";
import { HttpError } from "./http";
import type { DriverInput } from "./validation";

export async function listDrivers(query = "", page = 1) {
  await requireAdmin();
  const where = query ? { OR: [{ name: { contains: query } }, { slug: { contains: query } }] } : {};
  const [total, drivers] = await Promise.all([
    db().driver.count({ where }),
    db().driver.findMany({ where, orderBy: { createdAt: "desc" }, take: 20, skip: (page - 1) * 20,
      select: { id: true, name: true, slug: true, location: true, active: true, verified: true } }),
  ]);
  return { total, drivers };
}

export async function editorData(id?: string) {
  await requireAdmin();
  const [driver, services] = await Promise.all([
    id ? db().driver.findUnique({ where: { id }, include: { vehicles: { orderBy: [{ active: "desc" }, { createdAt: "asc" }], take: 1 }, services: { select: { id: true } } } }) : null,
    db().service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { driver, services };
}

export async function saveDriver(input: DriverInput, id?: string) {
  await requireApiAdmin();
  try {
    return await db().$transaction(async (tx) => {
      const existing = id ? await tx.driver.findUnique({ where: { id }, select: { id: true, slug: true, vehicles: { orderBy: [{ active: "desc" }, { createdAt: "asc" }], take: 1, select: { id: true } } } }) : null;
      if (id && !existing) throw new HttpError(404, "No se encontró el conductor.");
      if (existing && existing.slug !== input.slug) throw new HttpError(409, "La dirección del perfil es permanente para conservar el enlace NFC.", { slug: "No se puede cambiar una dirección ya creada." });
      const validServices = await tx.service.count({ where: { id: { in: input.serviceIds }, active: true } });
      if (validServices !== input.serviceIds.length) throw new HttpError(400, "Uno de los servicios ya no está disponible. Actualiza el formulario.");
      const data = {
        name: input.name, phone: input.phone || null, whatsapp: input.whatsapp || null, email: input.email || null,
        location: input.location || null, experience: input.experience, languages: input.languages,
        description: input.description || null, photoUrl: input.photoUrl || null,
        active: input.active, verified: input.verified,
      };
      const driver = id
        ? await tx.driver.update({ where: { id }, data: { ...data, services: { set: input.serviceIds.map((id) => ({ id })) } }, select: { id: true, slug: true } })
        : await tx.driver.create({ data: { ...data, slug: input.slug, services: { connect: input.serviceIds.map((id) => ({ id })) } }, select: { id: true, slug: true } });
      if (input.vehicle) {
        const vehicle = { ...input.vehicle, color: input.vehicle.color || null, plate: input.vehicle.plate || null, description: input.vehicle.description || null, photoUrl: input.vehicle.photoUrl || null, active: true };
        const vehicleId = existing?.vehicles[0]?.id;
        if (vehicleId) await tx.vehicle.update({ where: { id: vehicleId }, data: vehicle });
        else await tx.vehicle.create({ data: { ...vehicle, driverId: driver.id } });
      } else if (existing) {
        await tx.vehicle.updateMany({ where: { driverId: existing.id }, data: { active: false } });
      }
      return driver;
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") throw new HttpError(409, "Ya existe un conductor con esa dirección.", { slug: "Elige una dirección diferente." });
      if (error.code === "P2025") throw new HttpError(404, "No se encontró el conductor.");
    }
    throw error;
  }
}
