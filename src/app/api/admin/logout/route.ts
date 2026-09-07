import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { assertOrigin, handleApi, json } from "@/lib/http";
import { authConfiguration, hashToken, SESSION_COOKIE, validTokenFormat } from "@/lib/security";

export async function POST(request: Request) {
  return handleApi(async () => {
    assertOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token && validTokenFormat(token)) await db().adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: authConfiguration().secure, path: "/", expires: new Date(0), maxAge: 0 });
    return response;
  });
}
