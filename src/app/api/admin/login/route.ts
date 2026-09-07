import { compare, hashSync } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { consumeLoginAttempt } from "@/lib/login-throttle";
import { authConfiguration, hashToken, newSessionToken, SESSION_COOKIE, SESSION_SECONDS, validTokenFormat } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

const dummyHash = hashSync(randomBytes(32).toString("hex"), 12);

export async function POST(request: Request) {
  return handleApi(async () => {
    assertOrigin(request);
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa el usuario y la contraseña.");
    const { username, password } = parsed.data;
    if (!await consumeLoginAttempt(username)) throw new HttpError(429, "Demasiados intentos. Espera 15 minutos antes de volver a intentar.");
    const admin = await db().adminUser.findUnique({ where: { username }, select: { id: true, active: true, passwordHash: true } });
    const matches = await compare(password, admin?.passwordHash ?? dummyHash);
    if (!admin?.active || !matches || Buffer.byteLength(password, "utf8") > 72) throw new HttpError(401, "Usuario o contraseña incorrectos.");

    const token = newSessionToken();
    const expires = new Date(Date.now() + SESSION_SECONDS * 1000);
    const oldToken = (await cookies()).get(SESSION_COOKIE)?.value;
    await db().$transaction(async (tx) => {
      await tx.adminSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
      if (oldToken && validTokenFormat(oldToken)) await tx.adminSession.deleteMany({ where: { tokenHash: hashToken(oldToken) } });
      await tx.adminSession.create({ data: { tokenHash: hashToken(token), adminId: admin.id, expiresAt: expires } });
    });
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: authConfiguration().secure, path: "/", expires, maxAge: SESSION_SECONDS });
    return response;
  });
}
