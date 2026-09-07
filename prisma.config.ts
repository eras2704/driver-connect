import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Generar el cliente no requiere una conexión; migrar sí requiere DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL },
});
