import { createHmac, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "dc_admin_session";
export const SESSION_SECONDS = 8 * 60 * 60;

export function authConfiguration(env: Record<string, string | undefined> = process.env) {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configura SESSION_SECRET con al menos 32 caracteres.");
  const url = new URL(env.APP_ORIGIN || "http://127.0.0.1:3000");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) {
    throw new Error("APP_ORIGIN debe ser un origen HTTPS; HTTP sólo se permite en localhost.");
  }
  return { secret, origin: url.origin, secure: url.protocol === "https:" };
}

export function hashToken(token: string, secret = authConfiguration().secret) {
  return createHmac("sha256", secret).update(token).digest("hex");
}
export function newSessionToken() { return randomBytes(32).toString("hex"); }
export function validTokenFormat(token: string) { return /^[a-f0-9]{64}$/.test(token); }
export function sameOrigin(origin: string | null, expected: string) { return origin === expected; }
export function passwordError(password: string): string | undefined {
  if (password.length < 12) return "Usa una contraseña de al menos 12 caracteres.";
  if (Buffer.byteLength(password, "utf8") > 72) return "La contraseña no puede superar 72 bytes UTF-8.";
}
