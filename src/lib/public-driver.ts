import "server-only";
import { db } from "./db";
import { portraitUrl } from "./portrait-url";
import { servicePhotoUrl } from "./service-photo-url";

export async function publicDriver(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || slug === "demo") return null;
  // Lista explícita de campos públicos: nunca incluir usuarios, hashes, ids o placas.
  const driver = await db().driver.findFirst({ where: { slug, active: true }, select: {
    slug: true, name: true, phone: true, whatsapp: true, email: true, location: true, experience: true,
    languages: true, description: true, photoUrl: true, portraitStorageKey: true, verified: true,
    photos: { orderBy: [{ position: "asc" }, { id: "asc" }], take: 24, select: { id: true, caption: true, category: true, width: true, height: true } },
    servicePhotos: { select: { serviceId: true, storageKey: true } },
    user: { select: { active: true } },
    services: { where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, description: true, icon: true } },
    vehicles: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1, select: { brand: true, model: true, year: true, color: true, passengers: true, description: true, photoUrl: true } },
  } });
  if (!driver) return null;
  const { user, portraitStorageKey, servicePhotos, services, ...publicFields } = driver;
  return { ...publicFields, services: services.map(({ id, ...service }) => ({ ...service, photoUrl: servicePhotoUrl(servicePhotos.find(photo => photo.serviceId === id)?.storageKey) })), photoUrl: portraitUrl(portraitStorageKey) || driver.photoUrl, bookingEnabled: Boolean(user?.active && services.length), languages: Array.isArray(driver.languages) ? driver.languages.filter((value): value is string => typeof value === "string") : [] };
}
export type PublicDriver = NonNullable<Awaited<ReturnType<typeof publicDriver>>>;
