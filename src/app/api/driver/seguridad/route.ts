import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { authConfiguration, passwordError } from "@/lib/security";
import { DRIVER_COOKIE, requireApiDriver } from "@/lib/driver-session";
import { limitRequests } from "@/lib/request-limit";
const schema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().refine(v => !passwordError(v), "Usa entre 12 caracteres y 72 bytes."), confirmation: z.string() }).strict().refine(v => v.newPassword === v.confirmation, "Las contraseñas no coinciden.").refine(v => v.currentPassword !== v.newPassword, "Elige una contraseña diferente de la actual.");
export async function POST(request: Request) {
  return handleApi(async () => {
    const actor = await requireApiDriver(true); assertOrigin(request);
    await limitRequests("password", [{ value: actor.userId, limit: 8 }]);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const user = await db().driverUser.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!await compare(parsed.data.currentPassword, user.passwordHash) || Buffer.byteLength(parsed.data.currentPassword) > 72) throw new HttpError(400, "La contraseña actual no es correcta.");
    const passwordHash = await hash(parsed.data.newPassword, 12);
    await db().$transaction(async tx => {
      const updated = await tx.driverUser.updateMany({ where: { id: user.id, passwordHash: user.passwordHash, active: true }, data: { passwordHash, mustChangePassword: false } });
      if (!updated.count) throw new HttpError(409, "La cuenta cambió. Vuelve a iniciar sesión.");
      await tx.driverSession.deleteMany({ where: { userId: user.id } });
    });
    const response = json({ ok: true });
    response.cookies.set(DRIVER_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: authConfiguration().secure, path: "/", maxAge: 0 });
    return response;
  });
}
