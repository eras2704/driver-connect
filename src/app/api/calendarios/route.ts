import { randomBytes } from "node:crypto";
import * as oauth from "oauth4webapi";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertOrigin, handleApi, HttpError, json, readJson } from "@/lib/http";
import { limitRequests } from "@/lib/request-limit";
import { calendarOwner, cookieOptions, OAUTH_COOKIE } from "@/lib/cloud-calendar/access";
import { authorizationUrl, availableProviders } from "@/lib/cloud-calendar/providers";
import { digest, encrypt } from "@/lib/cloud-calendar/crypto";
import { disconnected } from "@/lib/cloud-calendar/queue";
const schema = z.object({ action: z.enum(["status", "connect", "disconnect", "retry"]), audience: z.discriminatedUnion("kind", [z.object({ kind: z.literal("driver") }).strict(), z.object({ kind: z.literal("passenger"), id: z.string().max(64), token: z.string().regex(/^[a-f0-9]{64}$/) }).strict()]), provider: z.enum(["GOOGLE", "MICROSOFT"]).optional(), connectionId: z.string().max(64).optional() }).strict();
export async function POST(request: Request) {
  return handleApi(async () => {
    assertOrigin(request); const parsed = schema.safeParse(await readJson(request)); if (!parsed.success) throw new HttpError(400, "Revisa la solicitud del calendario.");
    const { action, audience, provider, connectionId } = parsed.data, owner = await calendarOwner(audience, action === "connect");
    if (action === "status") {
      const connections = await db().calendarConnection.findMany({ where: { ownerKey: owner.ownerKey, ownerVersion: owner.ownerVersion, status: { not: "DISCONNECTED" } }, select: { id: true, provider: true, accountLabel: true, status: true, lastSyncAt: true, lastError: true, nextSyncAt: true, attempts: true } });
      return json({ providers: availableProviders(), connections, canConnect: owner.canConnect });
    }
    await limitRequests("calendar", [{ value: owner.ownerKey, limit: 20 }]);
    if (action === "connect") {
      if (!owner.canConnect) throw new HttpError(409, "Puedes conectar un viaje confirmado que todavía no haya terminado.");
      if (!provider || !availableProviders().includes(provider)) throw new HttpError(503, "La conexión con este proveedor todavía no está habilitada.");
      const state = oauth.generateRandomState(), verifier = oauth.generateRandomCodeVerifier(), browser = randomBytes(32).toString("hex"), stateHash = digest(state);
      await db().calendarOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      await db().calendarOAuthState.create({ data: { stateHash, browserHash: digest(browser), ownerKey: owner.ownerKey, ownerVersion: owner.ownerVersion, driverUserId: owner.driverUserId, bookingId: owner.bookingId, provider, verifier: encrypt(verifier, stateHash), expiresAt: new Date(Date.now() + 600_000) } });
      (await cookies()).set(OAUTH_COOKIE, browser, { ...cookieOptions(), maxAge: 600 });
      return json({ url: await authorizationUrl(provider, state, verifier) });
    }
    if (!connectionId) throw new HttpError(400, "Selecciona una conexión.");
    const connection = await db().calendarConnection.findFirst({ where: { id: connectionId, ownerKey: owner.ownerKey, ownerVersion: owner.ownerVersion, status: { not: "DISCONNECTED" } } });
    if (!connection) throw new HttpError(404, "No se encontró esa conexión.");
    if (action === "retry" && connection.status !== "ACTIVE") throw new HttpError(409, "Vuelve a autorizar tu cuenta de calendario.");
    await db().calendarConnection.update({ where: { id: connection.id }, data: action === "disconnect" ? disconnected : { nextSyncAt: new Date(), syncVersion: { increment: 1 } } });
    return json({ ok: true });
  });
}
