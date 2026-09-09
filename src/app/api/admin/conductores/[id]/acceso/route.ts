import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/admin-session";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { passwordError } from "@/lib/security";
import { usernameSchema } from "@/lib/validation";
const createSchema = z.object({ username: usernameSchema, password: z.string().refine(v => !passwordError(v), "Usa al menos 12 caracteres y como máximo 72 bytes."), active: z.boolean() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireApiAdmin(); assertOrigin(request);
    const { id } = await params, parsed = createSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    if (!await db().driver.findUnique({ where: { id }, select: { id: true } })) throw new HttpError(404, "No se encontró el conductor.");
    const passwordHash = await hash(parsed.data.password, 12);
    try {
      await db().$transaction(async tx => {
        const user = await tx.driverUser.upsert({ where: { driverId: id }, create: { driverId: id, username: parsed.data.username, passwordHash, active: parsed.data.active, mustChangePassword: true }, update: { username: parsed.data.username, passwordHash, active: parsed.data.active, mustChangePassword: true, calendarEnabled: false, calendarVersion: { increment: 1 } } });
        await tx.driverSession.deleteMany({ where: { userId: user.id } });
      });
    } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new HttpError(409, "Ese nombre de usuario ya está en uso."); throw error; }
    return json({ ok: true });
  });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireApiAdmin(); assertOrigin(request);
    const parsed = z.object({ active: z.boolean() }).strict().safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Estado inválido.");
    const { id } = await params;
    await db().$transaction(async tx => {
      const user = await tx.driverUser.findUnique({ where: { driverId: id } });
      if (!user) throw new HttpError(404, "Este conductor todavía no tiene acceso.");
      await tx.driverUser.update({ where: { id: user.id }, data: { active: parsed.data.active, calendarEnabled: false, calendarVersion: { increment: 1 } } });
      await tx.driverSession.deleteMany({ where: { userId: user.id } });
    });
    return json({ ok: true });
  });
}
