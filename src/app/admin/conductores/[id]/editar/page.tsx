import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverForm } from "@/components/admin/driver-form";
import { editorData } from "@/lib/drivers";
import type { DriverInput } from "@/lib/validation";
import { portraitUrl } from "@/lib/portrait-url";

export default async function EditDriverPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { id } = await params;
  const { driver, services } = await editorData(id);
  if (!driver) notFound();
  const vehicle = driver.vehicles.find((item) => item.active);
  const initial: DriverInput = {
    name: driver.name, slug: driver.slug, phone: driver.phone || "", whatsapp: driver.whatsapp || "", email: driver.email || "",
    location: driver.location || "", experience: driver.experience, description: driver.description || "", photoUrl: driver.photoUrl || "",
    languages: Array.isArray(driver.languages) ? driver.languages.filter((value): value is string => typeof value === "string") : [],
    active: driver.active, verified: driver.verified, serviceIds: driver.services.map((service) => service.id),
    vehicle: vehicle ? { brand: vehicle.brand, model: vehicle.model, year: vehicle.year, color: vehicle.color || "", plate: vehicle.plate || "", passengers: vehicle.passengers, description: vehicle.description || "", photoUrl: vehicle.photoUrl || "" } : null,
  };
  return <><div className="admin-heading"><div><span className="eyebrow">EDITAR PERFIL</span><h1>{driver.name}</h1><p>/conductor/{driver.slug} · {driver.active ? "Publicado" : "Borrador"}</p></div>{driver.active && <Link className="button button-secondary" href={`/conductor/${driver.slug}`} target="_blank" rel="noopener noreferrer">Ver perfil público ↗</Link>}</div>{(await searchParams).guardado === "1" && <p className="form-success" role="status">El perfil se guardó correctamente.</p>}<div className="detail-actions" style={{ marginBottom: "1.5rem" }}><Link className="button button-secondary" href={`/admin/conductores/${id}/acceso`}>Gestionar acceso del conductor →</Link></div><DriverForm key={driver.updatedAt.toISOString()} id={id} initial={initial} services={services} driverPortraitUrl={portraitUrl(driver.portraitStorageKey) || undefined} vehicleCoverUrl={driver.photos[0] ? `/media/${driver.photos[0].id}` : undefined} /></>;
}
