import "server-only";
import { createDatabase } from "./database";

const scope = globalThis as unknown as { driverConnectDb?: ReturnType<typeof createDatabase> };
export function db() {
  // La compilación no necesita credenciales ni una base de datos disponible.
  return scope.driverConnectDb ??= createDatabase();
}
