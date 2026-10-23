import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { createDatabase } from "../src/lib/database";

type Snapshot = { version: 1; targets: Record<string, string>; qr: Record<string, string> };
const database = createDatabase();
try {
  const drivers = await database.driver.findMany({ select: { id: true, slug: true, qrSlug: true, addresses: { select: { slug: true } } } });
  const snapshot: Snapshot = { version: 1, targets: Object.create(null) as Record<string, string>, qr: Object.create(null) as Record<string, string> };
  for (const driver of drivers) {
    snapshot.qr[driver.id] = driver.qrSlug || driver.slug;
    for (const slug of new Set([driver.slug, driver.qrSlug || driver.slug, ...driver.addresses.map(a => a.slug)])) {
      const previous = snapshot.targets[slug];
      if (previous && previous !== driver.id) throw new Error("Hay una dirección asociada a más de un perfil. No publiques antes de resolverla.");
      snapshot.targets[slug] = driver.id;
    }
    // A QR target must resolve through the same lookup used by public routes.
    if (driver.qrSlug && driver.qrSlug !== driver.slug && !driver.addresses.some(a => a.slug === driver.qrSlug)) throw new Error("Hay un QR sin dirección pública reservada. Revisa las migraciones antes de publicar.");
  }
  const [mode, file] = process.argv.slice(2);
  if (mode && (!["--snapshot", "--compare"].includes(mode) || !file)) throw new Error("Uso: node --import tsx scripts/verify-profile-links.ts [--snapshot archivo.json | --compare archivo.json]");
  if (mode === "--snapshot") await writeFile(file, JSON.stringify(snapshot, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  if (mode === "--compare") {
    const before = JSON.parse(await readFile(file, "utf8")) as Snapshot;
    if (before.version !== 1 || !before.targets || !before.qr) throw new Error("Formato de respaldo de direcciones no reconocido.");
    for (const [slug, id] of Object.entries(before.targets)) if (snapshot.targets[slug] !== id) throw new Error("Una dirección anterior perdió su perfil o cambió de propietario. No publiques.");
    for (const [id, slug] of Object.entries(before.qr)) if (snapshot.qr[id] !== slug) throw new Error("Cambió el destino permanente de un QR existente. No publiques.");
  }
  console.info(`Direcciones verificadas: ${Object.keys(snapshot.targets).length}. Perfiles: ${drivers.length}. ${mode === "--compare" ? "QR y direcciones anteriores conservados." : "Sin conflictos de propietario."}`);
} catch (error) {
  console.error(error instanceof Error && !(("code") in error) ? error.message : "No se pudo verificar la base. Revisa la conexión y las migraciones sin compartir credenciales.");
  process.exitCode = 1;
} finally { await database.$disconnect(); }
