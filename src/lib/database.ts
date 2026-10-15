import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL no está configurada.");
  const url = new URL(databaseUrl);
  if (url.protocol !== "mysql:") throw new Error("Se requiere una conexión MySQL.");
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    // Explicit opt-in for MySQL RSA authentication on a trusted private network.
    allowPublicKeyRetrieval: url.searchParams.get("allowPublicKeyRetrieval") === "true" || process.env.MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL === "true",
    ...(url.searchParams.get("ssl") === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  return new PrismaClient({ adapter });
}
