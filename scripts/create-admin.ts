import "dotenv/config";
import input from "@inquirer/input";
import passwordPrompt from "@inquirer/password";
import { hash } from "bcryptjs";
import { createDatabase } from "../src/lib/database";
import { passwordError } from "../src/lib/security";
import { usernameSchema } from "../src/lib/validation";

class BootstrapError extends Error {}
const database = createDatabase();
try {
  const username = usernameSchema.parse(process.env.ADMIN_USERNAME || await input({ message: "Usuario del administrador:", validate: (value) => usernameSchema.safeParse(value).success || "Usa de 3 a 64 letras minúsculas, números, puntos o guiones." }));
  const existing = await database.adminUser.findUnique({ where: { username }, select: { id: true } });
  const reset = process.argv.includes("--reset-password");
  if (existing && !reset) throw new BootstrapError("Ese administrador ya existe. Usa --reset-password únicamente si quieres cambiar su contraseña y cerrar sus sesiones.");
  if (!existing && reset) throw new BootstrapError("No existe ese administrador; omite --reset-password para crearlo.");
  const name = process.env.ADMIN_NAME || (reset ? "" : await input({ message: "Nombre del administrador:", validate: (value) => value.trim().length >= 2 && value.trim().length <= 191 || "Usa de 2 a 191 caracteres." }));
  if (!reset && (name.trim().length < 2 || name.trim().length > 191)) throw new BootstrapError("El nombre debe tener de 2 a 191 caracteres.");
  const password = process.env.ADMIN_PASSWORD || await passwordPrompt({ message: "Contraseña (mínimo 12 caracteres):", mask: true, toggleMask: false, validate: (value) => passwordError(value) || true });
  const invalid = passwordError(password);
  if (invalid) throw new BootstrapError(invalid);
  if (!process.env.ADMIN_PASSWORD) {
    const confirmation = await passwordPrompt({ message: "Repite la contraseña:", mask: true, toggleMask: false });
    if (password !== confirmation) throw new BootstrapError("Las contraseñas no coinciden.");
  }
  const passwordHash = await hash(password, 12);
  await database.$transaction(async (tx) => {
    if (existing) {
      await tx.adminUser.update({ where: { id: existing.id }, data: { passwordHash } });
      await tx.adminSession.deleteMany({ where: { adminId: existing.id } });
    } else {
      await tx.adminUser.create({ data: { username, name: name.trim(), passwordHash, active: true } });
    }
    for (const service of [
      { id: "airport", name: "Traslados al aeropuerto", description: "Traslados de llegada y salida coordinados con tu itinerario.", icon: "plane" },
      { id: "executive", name: "Traslados ejecutivos", description: "Recorridos para reuniones y compromisos de trabajo.", icon: "briefcase" },
      { id: "city", name: "Recorridos por la ciudad", description: "Recorridos privados a tu ritmo.", icon: "compass" },
    ]) await tx.service.upsert({ where: { name: service.name }, update: {}, create: { ...service, active: true } });
  });
  console.log(reset ? "Contraseña actualizada. Las sesiones anteriores quedaron cerradas." : `Administrador ${username} creado. Ya puedes entrar en /login-admin.`);
} catch (error) {
  console.error(error instanceof BootstrapError ? error.message : "No se pudo completar la operación. Revisa la conexión, los datos y las migraciones.");
  process.exitCode = 1;
} finally { await database.$disconnect(); }
