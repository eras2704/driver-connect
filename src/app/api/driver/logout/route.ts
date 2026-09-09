import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { assertOrigin, handleApi, json } from "@/lib/http";
import { authConfiguration, validTokenFormat } from "@/lib/security";
import { DRIVER_COOKIE, driverTokenHash } from "@/lib/driver-session";
export async function POST(request: Request) {
  return handleApi(async () => {
    assertOrigin(request);
    const token = (await cookies()).get(DRIVER_COOKIE)?.value;
    if (token && validTokenFormat(token)) await db().driverSession.deleteMany({ where: { tokenHash: driverTokenHash(token) } });
    const response = json({ ok: true });
    response.cookies.set(DRIVER_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: authConfiguration().secure, path: "/", maxAge: 0 });
    return response;
  });
}
