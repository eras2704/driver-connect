import "server-only";
import { queueBooking } from "./cloud-calendar/queue";
import { db } from "./db";
import { requireApiDriver, requireDriver } from "./driver-session";
import { HttpError } from "./http";
import { parsePanamaDate, monthRange, type TripStatus } from "./calendar";
import { hashToken } from "./security";
import { limitRequests } from "./request-limit";
import { passengerPath } from "./calendar-access";
import type { ManualBookingInput, RequestBookingInput } from "./booking-validation";
import type { Prisma } from "@/generated/prisma/client";
function dates(value: string, duration: number) {
  const startsAt = parsePanamaDate(value);
  if (startsAt.getTime() <= Date.now() || startsAt.getTime() > Date.now() + 366 * 86400_000) throw new HttpError(400, "Elige una fecha futura dentro de los próximos doce meses.");
  return { startsAt, endsAt: new Date(startsAt.getTime() + duration * 60_000) };
}
async function noOverlap(tx: Prisma.TransactionClient, driverId: string, startsAt: Date, endsAt: Date, id?: string) {
  const overlap = await tx.booking.findFirst({ where: { driverId, status: "CONFIRMED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (overlap) throw new HttpError(409, "Ese horario coincide con otro viaje confirmado. Ajusta la hora o la duración.");
}
export async function requestBooking(slug: string, input: RequestBookingInput) {
  const interval = dates(input.startsAt, 60);
  const driver = await db().driver.findUnique({ where: { slug }, select: { id: true, active: true, user: { select: { active: true } }, services: { where: { id: input.serviceId, active: true }, select: { name: true } }, vehicles: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1, select: { passengers: true } } } });
  if (!driver?.active || !driver.user?.active || !driver.services.length) throw new HttpError(404, "Este conductor o servicio no recibe solicitudes en este momento.");
  if (driver.vehicles[0] && input.passengers > driver.vehicles[0].passengers) throw new HttpError(400, "La cantidad de pasajeros supera la capacidad del vehículo.");
  const requestHash = hashToken(`booking:${driver.id}:${input.requestId}`);
  const payloadHash = hashToken(JSON.stringify(input));
  const previous = await db().booking.findUnique({ where: { requestHash } });
  if (previous) {
    if (previous.payloadHash !== payloadHash) throw new HttpError(409, "Esta solicitud ya se recibió con otros datos. Abre el formulario de nuevo para solicitar otro viaje.");
    return { path: passengerPath(previous) };
  }
  await limitRequests("booking", [{ value: "all", limit: 200 }, { value: driver.id, limit: 30 }, { value: `${driver.id}:${input.phone}`, limit: 3 }]);
  try {
    const booking = await db().booking.create({ data: { driverId: driver.id, serviceName: driver.services[0].name, customerName: input.customerName, phone: input.phone, email: input.email || null, pickup: input.pickup, destination: input.destination, notes: input.notes || null, passengers: input.passengers, ...interval, requestHash, payloadHash } });
    return { path: passengerPath(booking) };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const existing = await db().booking.findUnique({ where: { requestHash } });
      if (existing?.payloadHash === payloadHash) return { path: passengerPath(existing) };
      throw new HttpError(409, "La solicitud ya existe. Revisa sus datos.");
    }
    throw error;
  }
}
export async function saveBooking(input: ManualBookingInput, id?: string, expectedVersion?: number) {
  const actor = await requireApiDriver(), interval = dates(input.startsAt, input.duration);
  return db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${actor.driverId} FOR UPDATE`;
    const existing = id ? await tx.booking.findFirst({ where: { id, driverId: actor.driverId } }) : null;
    if (id && !existing) throw new HttpError(404, "No se encontró el viaje.");
    if (existing && existing.version !== expectedVersion) throw new HttpError(409, "El viaje cambió. Actualiza la página antes de guardar.");
    if (existing && ["CANCELLED", "REJECTED"].includes(existing.status)) throw new HttpError(409, "Este viaje está cerrado. Crea un nuevo viaje si necesitas reprogramarlo.");
    if (!existing || existing.status === "CONFIRMED") await noOverlap(tx, actor.driverId, interval.startsAt, interval.endsAt, id);
    const data = { serviceName: input.serviceName, customerName: input.customerName, phone: input.phone, email: input.email || null, pickup: input.pickup, destination: input.destination, notes: input.notes || null, passengers: input.passengers, ...interval };
    const booking = existing ? await tx.booking.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } }) : await tx.booking.create({ data: { ...data, driverId: actor.driverId, status: "CONFIRMED", wasConfirmed: true, source: "MANUAL" } });
    await queueBooking(tx, booking);
    return { id: booking.id, path: passengerPath(booking) };
  });
}
export async function changeBookingStatus(id: string, status: Exclude<TripStatus, "PENDING">, version: number) {
  const actor = await requireApiDriver();
  return db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${actor.driverId} FOR UPDATE`;
    const booking = await tx.booking.findFirst({ where: { id, driverId: actor.driverId } });
    if (!booking) throw new HttpError(404, "No se encontró el viaje.");
    if (booking.version !== version) throw new HttpError(409, "El viaje cambió. Actualiza la página antes de continuar.");
    if (booking.status === status) return { ok: true };
    if (["CANCELLED", "REJECTED"].includes(booking.status) || (booking.status === "CONFIRMED" && status === "REJECTED")) throw new HttpError(409, "Este cambio de estado no está disponible.");
    if (status === "CONFIRMED") {
      if (booking.startsAt <= new Date()) throw new HttpError(400, "No se puede confirmar un viaje cuya hora ya pasó.");
      await noOverlap(tx, actor.driverId, booking.startsAt, booking.endsAt, id);
    }
    await tx.booking.update({ where: { id }, data: { status, version: { increment: 1 }, ...(status === "CONFIRMED" ? { wasConfirmed: true } : {}) } });
    await queueBooking(tx, booking);
    return { ok: true };
  });
}
export async function driverAgenda(month?: string, pendingOnly = false) {
  const actor = await requireDriver(), range = monthRange(month);
  const where = { driverId: actor.driverId, ...(pendingOnly ? { status: "PENDING" as const } : { startsAt: { gte: range.start, lt: range.end } }) };
  const [trips, pending, total] = await Promise.all([
    db().booking.findMany({ where, orderBy: { startsAt: "asc" }, take: 300 }),
    db().booking.count({ where: { driverId: actor.driverId, status: "PENDING" } }),
    db().booking.count({ where }),
  ]);
  return { actor, range, trips, pending, total };
}
