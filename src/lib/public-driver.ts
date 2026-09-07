import "server-only";
import { db } from "./db";

export async function publicDriver(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || slug === "demo") return null;
  // Lista explícita de campos públicos: nunca incluir usuarios, hashes, ids o placas.
  const driver = await db().driver.findFirst({ where: { slug, active: true }, select: {
    slug: true, name: true, phone: true, whatsapp: true, email: true, location: true, experience: true,
    languages: true, description: true, photoUrl: true, verified: true,
    services: { where: { active: true }, orderBy: { name: "asc" }, select: { name: true, description: true, icon: true } },
    vehicles: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1, select: { brand: true, model: true, year: true, color: true, passengers: true, description: true, photoUrl: true } },
  } });
  if (!driver) return null;
  return { ...driver, languages: Array.isArray(driver.languages) ? driver.languages.filter((value): value is string => typeof value === "string") : [] };
}
export type PublicDriver = NonNullable<Awaited<ReturnType<typeof publicDriver>>>;
