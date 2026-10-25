import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./http";
import type { CardOperation } from "./card-validation";

export async function operateCard(driverId: string, adminId: string, input: CardOperation) {
  return db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM CardRegistryLock WHERE id = 1 FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${driverId} FOR UPDATE`;
    const driver = await tx.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new HttpError(404, "No se encontró el conductor.");
    const previous = await tx.cardEvent.findUnique({ where: { id: input.requestId } });
    if (previous) {
      const matches = previous.adminId === adminId && (
        input.action === "prepare" ? previous.action === "PREPARE" && previous.toDriverId === driverId && previous.reference === input.reference :
        input.action === "assign" ? previous.action === "ASSIGN" && previous.toDriverId === driverId && previous.cardSlug === input.slug && previous.reference === input.reference :
        previous.action === "RELEASE" && previous.fromDriverId === driverId && previous.reference === input.upgradeId
      );
      if (!matches) throw new HttpError(409, "La operación ya fue utilizada con otros datos.");
      return { ok: true };
    }
    if (input.action === "prepare") {
      if (await tx.cardUpgrade.findFirst({ where: { driverId, status: "PREPARED" } })) throw new HttpError(409, "Ya hay una tarjeta premium preparada para este conductor.");
      const normalSlug = driver.qrSlug || driver.slug;
      const owner = await tx.driverAddress.findUnique({ where: { slug: normalSlug } });
      const card = await tx.physicalCard.findUnique({ where: { slug: normalSlug } });
      if (card && (card.kind !== "NORMAL" || card.driverId !== driverId)) throw new HttpError(409, "Solo se libera una tarjeta normal asignada a este conductor.");
      if ((owner && owner.driverId !== driverId) || (!owner && driver.slug !== normalSlug)) throw new HttpError(409, "El QR actual no pertenece a este perfil.");
      if (await tx.driver.findFirst({ where: { id: { not: driverId }, OR: [{ slug: normalSlug }, { qrSlug: normalSlug }] } })) throw new HttpError(409, "Dirección en conflicto: revisa el QR antes del upgrade.");
      if (!card) await tx.physicalCard.create({ data: { slug: normalSlug, kind: "NORMAL", driverId } });
      const premiumSlug = `tarjeta-premium-${randomUUID()}`;
      await tx.driverAddress.create({ data: { slug: premiumSlug, driverId } });
      await tx.physicalCard.create({ data: { slug: premiumSlug, kind: "PREMIUM", driverId } });
      await tx.cardUpgrade.create({ data: { id: input.requestId, driverId, normalSlug, premiumSlug, reference: input.reference, status: "PREPARED", createdBy: adminId } });
      await tx.cardEvent.create({ data: { id: input.requestId, cardSlug: premiumSlug, action: "PREPARE", toDriverId: driverId, adminId, reference: input.reference } });
      return { ok: true };
    }
    if (input.action === "complete") {
      const upgrade = await tx.cardUpgrade.findUnique({ where: { id: input.upgradeId } });
      if (!upgrade || upgrade.driverId !== driverId || upgrade.status !== "PREPARED") throw new HttpError(409, "El upgrade no está pendiente para este conductor.");
      const normal = await tx.physicalCard.findUnique({ where: { slug: upgrade.normalSlug } });
      const premium = await tx.physicalCard.findUnique({ where: { slug: upgrade.premiumSlug } });
      const premiumAddress = await tx.driverAddress.findUnique({ where: { slug: upgrade.premiumSlug } });
      if ((driver.qrSlug || driver.slug) !== upgrade.normalSlug || normal?.driverId !== driverId || normal.kind !== "NORMAL" || premium?.driverId !== driverId || premium.kind !== "PREMIUM" || premiumAddress?.driverId !== driverId) throw new HttpError(409, "La asignación cambió. Revisa las tarjetas antes de continuar.");
      // The printed address cannot remain the old driver's canonical URL after reuse.
      await tx.driver.update({ where: { id: driverId }, data: { qrSlug: upgrade.premiumSlug, ...(driver.slug === upgrade.normalSlug ? { slug: upgrade.premiumSlug } : {}) } });
      await tx.driverAddress.deleteMany({ where: { slug: upgrade.normalSlug, driverId } });
      await tx.physicalCard.update({ where: { slug: upgrade.normalSlug }, data: { driverId: null, releaseUpgradeId: upgrade.id } });
      await tx.cardUpgrade.update({ where: { id: upgrade.id }, data: { status: "COMPLETED", completedBy: adminId, completedAt: new Date() } });
      await tx.cardEvent.create({ data: { id: input.requestId, cardSlug: upgrade.normalSlug, action: "RELEASE", fromDriverId: driverId, adminId, reference: upgrade.id } });
      return { ok: true };
    }
    const card = await tx.physicalCard.findUnique({ where: { slug: input.slug } });
    const upgrade = card?.releaseUpgradeId ? await tx.cardUpgrade.findUnique({ where: { id: card.releaseUpgradeId } }) : null;
    if (!card || card.kind !== "NORMAL" || card.driverId || !upgrade || upgrade.status !== "COMPLETED" || upgrade.normalSlug !== card.slug) throw new HttpError(409, "Esta tarjeta no está disponible después de un upgrade completado.");
    if (upgrade.driverId === driverId) throw new HttpError(409, "La tarjeta recuperada debe asignarse a otro conductor.");
    if (await tx.driverAddress.findUnique({ where: { slug: card.slug } }) || await tx.driver.findUnique({ where: { slug: card.slug } })) throw new HttpError(409, "La dirección de esta tarjeta sigue ocupada.");
    const current = await tx.physicalCard.findUnique({ where: { slug: driver.qrSlug || driver.slug } });
    if (current?.kind === "PREMIUM" || await tx.cardUpgrade.findFirst({ where: { driverId, status: "PREPARED" } })) throw new HttpError(409, "Este conductor tiene tarjeta premium o un upgrade pendiente.");
    await tx.driverAddress.create({ data: { slug: card.slug, driverId } });
    await tx.driver.update({ where: { id: driverId }, data: { qrSlug: card.slug } });
    await tx.physicalCard.update({ where: { slug: card.slug }, data: { driverId } });
    await tx.cardEvent.create({ data: { id: input.requestId, cardSlug: card.slug, action: "ASSIGN", toDriverId: driverId, adminId, reference: input.reference } });
    return { ok: true };
  });
}
