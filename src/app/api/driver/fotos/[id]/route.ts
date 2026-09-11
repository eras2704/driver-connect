import { db } from "@/lib/db";
import { requireApiDriver } from "@/lib/driver-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { removePhoto } from "@/lib/photo-storage";
import { z } from "zod";
const edit = z.discriminatedUnion("action", [z.object({ action: z.literal("edit"), caption: z.string().trim().min(1).max(160), category: z.enum(["TRIP", "VEHICLE"]) }).strict(), z.object({ action: z.literal("move"), direction: z.enum(["up", "down"]) }).strict()]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    assertOrigin(request); const actor = await requireApiDriver(), { id } = await params, parsed = edit.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa los datos de la foto.");
    await db().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Driver WHERE id = ${actor.driverId} FOR UPDATE`;
      const photos = await tx.driverPhoto.findMany({ where: { driverId: actor.driverId }, orderBy: [{ position: "asc" }, { id: "asc" }] });
      const index = photos.findIndex(p => p.id === id); if (index < 0) throw new HttpError(404, "No se encontró la foto.");
      const data = parsed.data;
      if (data.action === "edit") await tx.driverPhoto.update({ where: { id }, data: { caption: data.caption, category: data.category } });
      else { const other = index + (data.direction === "up" ? -1 : 1); if (photos[other]) { [photos[index], photos[other]] = [photos[other], photos[index]]; for (const [position, photo] of photos.entries()) await tx.driverPhoto.update({ where: { id: photo.id }, data: { position } }); } }
    }); return json({ ok: true });
  });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    assertOrigin(request); const actor = await requireApiDriver(), { id } = await params;
    const photo = await db().driverPhoto.findFirst({ where: { id, driverId: actor.driverId } }); if (!photo) throw new HttpError(404, "No se encontró la foto.");
    await db().driverPhoto.deleteMany({ where: { id, driverId: actor.driverId } });
    // La ruta pública deja de servirla al borrar el registro, incluso si el disco falla.
    try { await removePhoto(photo.storageKey); } catch { console.error("No se pudo retirar una foto del almacenamiento."); }
    return json({ ok: true });
  });
}
