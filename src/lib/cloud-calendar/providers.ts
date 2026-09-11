import * as oauth from "oauth4webapi";
import type { CalendarTrip } from "../calendar";
import { authConfiguration } from "../security";
import { encryptionReady } from "./crypto";
export type Provider = "GOOGLE" | "MICROSOFT";
export const providerNames = { GOOGLE: "Google", MICROSOFT: "Microsoft / Outlook" };
export class CalendarError extends Error { constructor(public code: "REAUTH" | "RETRY" | "CONFIG" | "MISSING", public retryAfter = 0) { super(code); } }
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";
export function configuration(provider: Provider) {
  const client_id = process.env[`CALENDAR_${provider}_CLIENT_ID`], secret = process.env[`CALENDAR_${provider}_CLIENT_SECRET`];
  if (!client_id || !secret || !encryptionReady()) throw new CalendarError("CONFIG");
  const as: oauth.AuthorizationServer = provider === "GOOGLE" ? { issuer: "https://accounts.google.com", authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth", token_endpoint: "https://oauth2.googleapis.com/token" } : { issuer: "https://login.microsoftonline.com/common/v2.0", authorization_endpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", token_endpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token" };
  return { as, client: { client_id } satisfies oauth.Client, auth: oauth.ClientSecretPost(secret), redirect: `${authConfiguration().origin}/api/calendarios/callback/${provider.toLowerCase()}`, scope: provider === "GOOGLE" ? `${GOOGLE_SCOPE} https://www.googleapis.com/auth/userinfo.email` : "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access" };
}
export function availableProviders(): Provider[] { return (["GOOGLE", "MICROSOFT"] as const).filter(provider => { try { configuration(provider); return true; } catch { return false; } }); }
export async function authorizationUrl(provider: Provider, state: string, verifier: string) {
  const config = configuration(provider), url = new URL(config.as.authorization_endpoint!);
  const params = { client_id: config.client.client_id, redirect_uri: config.redirect, response_type: "code", scope: config.scope, state, code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256", prompt: provider === "GOOGLE" ? "consent select_account" : "select_account", ...(provider === "GOOGLE" ? { access_type: "offline" } : {}) };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value)); return url.href;
}
export async function exchangeCode(provider: Provider, params: URLSearchParams, state: string, verifier: string) {
  const c = configuration(provider), validated = oauth.validateAuthResponse(c.as, c.client, params, state);
  const response = await oauth.authorizationCodeGrantRequest(c.as, c.client, c.auth, validated, c.redirect, verifier, { signal: AbortSignal.timeout(20_000) });
  const token = await oauth.processAuthorizationCodeResponse(c.as, c.client, response);
  if (!token.refresh_token || !token.scope || !(provider === "GOOGLE" ? token.scope.split(" ").includes(GOOGLE_SCOPE) : token.scope.toLowerCase().includes("calendars.readwrite"))) throw new CalendarError("REAUTH");
  const account = await api(provider === "GOOGLE" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName", token.access_token);
  if (typeof account.id !== "string") throw new CalendarError("RETRY");
  return { refreshToken: token.refresh_token, accountId: account.id, label: String(account.email || account.mail || account.userPrincipalName || providerNames[provider]).slice(0, 191) };
}
export async function refresh(provider: Provider, refreshToken: string) {
  const c = configuration(provider);
  try { const response = await oauth.refreshTokenGrantRequest(c.as, c.client, c.auth, refreshToken, { signal: AbortSignal.timeout(20_000) }); const token = await oauth.processRefreshTokenResponse(c.as, c.client, response); return { accessToken: token.access_token, refreshToken: token.refresh_token }; }
  catch (error) { if (error instanceof oauth.ResponseBodyError && ["invalid_grant", "invalid_client", "unauthorized_client"].includes(error.error)) throw new CalendarError(error.error === "invalid_grant" ? "REAUTH" : "CONFIG"); throw new CalendarError("RETRY"); }
}
async function api(url: string, token: string, method = "GET", body?: object): Promise<Record<string, unknown>> {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: 'IdType="ImmutableId"' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000), redirect: "error", cache: "no-store" });
  if (response.status === 401 || response.status === 403) throw new CalendarError("REAUTH");
  if (response.status === 404 || response.status === 410) throw new CalendarError("MISSING");
  if (!response.ok) { if (response.status === 409) return { conflict: true }; const header = response.headers.get("retry-after"); const seconds = Number(header); const delay = header ? (Number.isFinite(seconds) ? seconds * 1000 : new Date(header).getTime() - Date.now()) : 0; throw new CalendarError("RETRY", Math.max(0, Math.min(Number.isFinite(delay) ? delay : 0, 86400_000))); }
  if (response.status === 204) return {}; return response.json();
}
export function eventBody(provider: Provider, trip: CalendarTrip) {
  const title = `${trip.serviceName} · Driver Connect`, details = `Recogida: ${trip.pickup}\nDestino: ${trip.destination}\nGestiona horarios y cancelaciones en Driver Connect. Hora del servicio: Panamá.`;
  if (provider === "GOOGLE") return { summary: title, description: details.replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!), location: trip.pickup, start: { dateTime: trip.startsAt.toISOString(), timeZone: "America/Panama" }, end: { dateTime: trip.endsAt.toISOString(), timeZone: "America/Panama" } };
  return { subject: title, body: { contentType: "text", content: details }, location: { displayName: trip.pickup }, start: { dateTime: trip.startsAt.toISOString().replace("Z", ""), timeZone: "UTC" }, end: { dateTime: trip.endsAt.toISOString().replace("Z", ""), timeZone: "UTC" } };
}
const MS_PROPERTY = "String {7f8e7c4c-1f78-4d39-a3a2-94fb331cc27d} Name DriverConnectEvent";
export async function writeEvent(provider: Provider, token: string, trip: CalendarTrip, mapping: { operationId: string; externalId: string | null }) {
  const base = provider === "GOOGLE" ? "https://www.googleapis.com/calendar/v3/calendars/primary/events" : "https://graph.microsoft.com/v1.0/me/calendar/events";
  const body = eventBody(provider, trip), googleId = `dc${mapping.operationId.replaceAll("-", "")}`;
  let existingId = mapping.externalId;
  if (!existingId && provider === "MICROSOFT") {
    const query = new URL("https://graph.microsoft.com/v1.0/me/events");
    query.searchParams.set("$filter", `singleValueExtendedProperties/Any(ep: ep/id eq '${MS_PROPERTY}' and ep/value eq '${mapping.operationId}')`);
    query.searchParams.set("$select", "id");
    const recovered = await api(query.href, token);
    existingId = Array.isArray(recovered.value) && typeof recovered.value[0]?.id === "string" ? recovered.value[0].id : null;
  }
  if (trip.status !== "CONFIRMED") {
    // Una creación puede haberse completado antes de una caída: recupera su identidad para cancelarla.
    const id = existingId || (provider === "GOOGLE" ? googleId : null);
    if (id) try { await api(`${base}/${encodeURIComponent(id)}`, token, "DELETE"); } catch (error) { if (!(error instanceof CalendarError && error.code === "MISSING")) throw error; }
    return id;
  }
  if (existingId) {
    try { await api(`${base}/${encodeURIComponent(existingId)}`, token, "PATCH", body); return existingId; }
    catch (error) { if (!(error instanceof CalendarError && error.code === "MISSING")) throw error; /* Una copia eliminada por su dueño no se recrea sin una nueva conexión. */ return existingId; }
  }
  const created = await api(base, token, "POST", { ...body, ...(provider === "GOOGLE" ? { id: googleId, extendedProperties: { private: { driverConnect: mapping.operationId } } } : { transactionId: mapping.operationId, singleValueExtendedProperties: [{ id: MS_PROPERTY, value: mapping.operationId }] }) });
  if (provider === "GOOGLE" && created.conflict) { await api(`${base}/${googleId}`, token, "PATCH", body); return googleId; }
  if (typeof created.id !== "string") throw new CalendarError("RETRY"); return created.id;
}
