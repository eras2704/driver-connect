import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function key() { const value = process.env.CALENDAR_TOKEN_KEY || ""; if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Configura CALENDAR_TOKEN_KEY con 32 bytes hexadecimales."); return Buffer.from(value, "hex"); }
export function encryptionReady() { try { key(); return true; } catch { return false; } }
export function encrypt(value: string, context: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv); cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return [iv, cipher.getAuthTag(), body].map(part => part.toString("base64url")).join(".");
}
export function decrypt(value: string, context: string) {
  const [iv, tag, body, extra] = value.split("."); if (!iv || !tag || !body || extra) throw new Error("Credencial inválida.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url")); decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
