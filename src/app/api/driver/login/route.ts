import { compare, hashSync } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { limitRequests } from "@/lib/request-limit";
import { authConfiguration, newSessionToken, SESSION_SECONDS, validTokenFormat } from "@/lib/security";
import { DRIVER_COOKIE, driverTokenHash } from "@/lib/driver-session";
import { loginSchema } from "@/lib/validation";
const dummyHash = hashSync(randomBytes(32).toString("hex"), 12);
export async function POST(request: Request) {
  return handleApi(async () => {
    assertOrigin(request);
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Revisa el usuario y la contraseña.");
    const { username, password } = parsed.data;
    await limitRequests("driver-login", [{ value: "all", limit: 200 }, { value: username, limit: 8 }]);
    const user = await db().driverUser.findUnique({ where: { username }, select: { id: true, passwordHash: true, active: true } });
    const matches = await compare(password, user?.passwordHash ?? dummyHash);
    if (!user?.active || !matches || Buffer.byteLength(password) > 72) throw new HttpError(401, "Usuario o contraseña incorrectos.");
    const token = newSessionToken(), expires = new Date(Date.now() + SESSION_SECONDS * 1000);
    const oldToken = (await cookies()).get(DRIVER_COOKIE)?.value;
    await db().$transaction(async tx => {
      await tx.driverSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
      if (oldToken && validTokenFormat(oldToken)) await tx.driverSession.deleteMany({ where: { tokenHash: driverTokenHash(oldToken) } });
      await tx.driverSession.create({ data: { tokenHash: driverTokenHash(token), userId: user.id, expiresAt: expires } });
    });
    const response = json({ ok: true });
    response.cookies.set(DRIVER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: authConfiguration().secure, path: "/", expires, maxAge: SESSION_SECONDS });
    return response;
  });
}
