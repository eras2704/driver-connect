import "dotenv/config";
import { setTimeout } from "node:timers/promises";
import { createDatabase } from "../src/lib/database";
import { syncNext } from "../src/lib/cloud-calendar/worker";
import { availableProviders } from "../src/lib/cloud-calendar/providers";
const database = createDatabase(); let stopping = false;
process.on("SIGTERM", () => { stopping = true; }); process.on("SIGINT", () => { stopping = true; });
if (!availableProviders().length) { console.error("Configura al menos un proveedor de calendario y CALENDAR_TOKEN_KEY."); await database.$disconnect(); process.exitCode = 1; }
else { console.info("Sincronización de calendarios iniciada."); try { while (!stopping) { try { if (!await syncNext(database)) await setTimeout(5000); } catch { console.error("Sincronización temporalmente no disponible; se reintentará."); await setTimeout(15_000); } } } finally { await database.$disconnect(); } }
