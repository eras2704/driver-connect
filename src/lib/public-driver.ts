import { serviceAvailable } from "./subscription";
import "server-only";
import { db } from "./db";
import { driverAddressWhere } from "./driver-address";
import { portraitUrl } from "./portrait-url";
import { servicePhotoUrl } from "./service-photo-url";

export async function publicDriver(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || slug === "demo") return null;
  // Lista explícita de campos públicos: nunca incluir usuarios, hashes, ids o placas.
  const driver = await db().driver.findFirst({ where: { ...driverAddressWhere(slug), active: true }, select: {
    customServicesEnabled: true, customServices: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 5, select: { name: true, nameEn: true, description: true, descriptionEn: true, photoStorageKey: true } }, serviceStartsAt: true, serviceExpiresAt: true, slug: true, name: true, phone: true, whatsapp: true, email: true, location: true, experience: true,
    languages: true, description: true, descriptionEn: true, photoUrl: true, portraitStorageKey: true, verified: true,
    photos: { orderBy: [{ position: "asc" }, { id: "asc" }], take: 24, select: { id: true, caption: true, category: true, width: true, height: true } },
    servicePhotos: { select: { serviceId: true, storageKey: true } },
    user: { select: { active: true } },
    services: { where: { active: true }, take: 5, orderBy: { name: "asc" }, select: { id: true, name: true, description: true, icon: true } },
    vehicles: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 10, select: { photoStorageKey: true, brand: true, model: true, year: true, color: true, colorEn: true, passengers: true, description: true, descriptionEn: true, photoUrl: true } },
  } });
  if (!driver) return null;
  const { user, serviceStartsAt, serviceExpiresAt, portraitStorageKey, servicePhotos, services, customServicesEnabled, customServices, vehicles, ...publicFields } = driver;
  if (!serviceAvailable({ serviceStartsAt, serviceExpiresAt })) return null;
  const visibleServices: { name: string; nameEn: string | null; description: string | null; descriptionEn: string | null; icon: string | null; photoUrl: string | null }[] = customServicesEnabled ? customServices.map(s => ({ name: s.name, nameEn: s.nameEn, description: s.description, descriptionEn: s.descriptionEn, icon: null, photoUrl: s.photoStorageKey ? `/media/prestaciones/${s.photoStorageKey}` : null })) : services.map(({ id, ...service }) => ({ ...service, nameEn: null, descriptionEn: null, photoUrl: servicePhotoUrl(servicePhotos.find(photo => photo.serviceId === id)?.storageKey) }));
  return { ...publicFields, vehicles: vehicles.map(({ photoStorageKey, ...v }) => ({ ...v, photoUrl: photoStorageKey ? `/media/vehiculos/${photoStorageKey}` : v.photoUrl })), services: visibleServices, photoUrl: portraitUrl(portraitStorageKey) || driver.photoUrl, bookingEnabled: Boolean(user?.active && visibleServices.length), languages: Array.isArray(driver.languages) ? driver.languages.filter((value): value is string => typeof value === "string") : [] };
}
export type PublicDriver = NonNullable<Awaited<ReturnType<typeof publicDriver>>>;
