import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { renewalEnd, serviceEnd } from "@/lib/subscription";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dates"), requestId: z.string().uuid(), startsAt: z.string().regex(/^20\d{2}-\d{2}-\d{2}$/), reference: z.string().trim().min(1).max(191) }).strict(),
  z.object({ action: z.literal("renew"), requestId: z.string().uuid(), reference: z.string().trim().min(1).max(191), paymentConfirmed: z.literal(true) }).strict(),
]);
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireApiAdmin(); assertOrigin(request);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa la fecha, la referencia y la confirmación del pago.");
    const input = parsed.data, { id } = await params;
    await db().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${id} FOR UPDATE`;
      const driver = await tx.driver.findUnique({ where: { id } });
      if (!driver) throw new HttpError(404, "No se encontró el conductor.");
      const previous = await tx.servicePeriod.findUnique({ where: { id: input.requestId } });
      if (previous) {
        if (previous.driverId !== id || previous.action !== input.action || previous.reference !== input.reference || (input.action === "dates" && previous.startsAt.toISOString().slice(0, 10) !== input.startsAt)) throw new HttpError(409, "Esta operación ya fue utilizada con otros datos.");
        return;
      }
      const now = new Date();
      if (input.action === "renew" && await tx.servicePeriod.findFirst({ where: { driverId: id, action: "renew", reference: input.reference } })) throw new HttpError(409, "Este pago ya tiene una renovación registrada. Usa una referencia diferente para otro pago.");
      if (input.action === "renew" && !driver.serviceExpiresAt) throw new HttpError(400, "Asigna primero la fecha de inicio del servicio.");
      const startsAt = input.action === "dates" ? new Date(`${input.startsAt}T00:00:00-05:00`) : new Date(Math.max(now.getTime(), driver.serviceExpiresAt!.getTime()));
      if (!Number.isFinite(startsAt.getTime()) || (input.action === "dates" && startsAt.toISOString().slice(0, 10) !== input.startsAt)) throw new HttpError(400, "Fecha inválida.");
      const expiresAt = input.action === "dates" ? serviceEnd(startsAt) : renewalEnd(driver.serviceExpiresAt, now);
      await tx.driver.update({ where: { id }, data: { serviceStartsAt: input.action === "dates" ? startsAt : driver.serviceStartsAt, serviceExpiresAt: expiresAt, serviceRequiresAssignment: false } });
      await tx.servicePeriod.create({ data: { id: input.requestId, driverId: id, adminId: admin.id, action: input.action, reference: input.reference, previousExpiresAt: driver.serviceExpiresAt, startsAt, expiresAt } });
      await tx.calendarConnection.updateMany({ where: { driverUser: { driverId: id }, status: "ACTIVE" }, data: { nextSyncAt: now, syncVersion: { increment: 1 } } });
    });
    return json({ ok: true });
  });
}
