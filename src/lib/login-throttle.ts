import "server-only";
import { db } from "./db";
import { hashToken } from "./security";

export async function consumeLoginAttempt(username: string, now = new Date()) {
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(now.getTime() / windowMs);
  const expiresAt = new Date((window + 1) * windowMs);
  const keys = [{ key: `${window}:all`, limit: 200 }, { key: `${window}:${hashToken(`login:${username}`)}`, limit: 8 }];
  await db().adminLoginAttempt.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
  for (const item of keys) {
    await db().$executeRaw`INSERT INTO AdminLoginAttempt (\`key\`, attempts, expiresAt) VALUES (${item.key}, 1, ${expiresAt}) ON DUPLICATE KEY UPDATE attempts = attempts + 1`;
    const bucket = await db().adminLoginAttempt.findUniqueOrThrow({ where: { key: item.key } });
    if (bucket.attempts > item.limit) return false;
  }
  return true;
}
