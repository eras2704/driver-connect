import "server-only";
import { db } from "./db";
import { hashToken } from "./security";
import { HttpError } from "./http";
export async function limitRequests(namespace: string, buckets: { value: string; limit: number }[]) {
  const now = Date.now(), duration = 15 * 60_000, window = Math.floor(now / duration), expiresAt = new Date((window + 1) * duration);
  await db().requestLimit.deleteMany({ where: { expiresAt: { lt: new Date(now - 86400_000) } } });
  for (const bucket of buckets) {
    const key = `${namespace}:${window}:${hashToken(bucket.value)}`;
    await db().$executeRaw`INSERT INTO RequestLimit (\`key\`, attempts, expiresAt) VALUES (${key}, 1, ${expiresAt}) ON DUPLICATE KEY UPDATE attempts = attempts + 1`;
    const stored = await db().requestLimit.findUniqueOrThrow({ where: { key } });
    if (stored.attempts > bucket.limit) throw new HttpError(429, "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.");
  }
}
