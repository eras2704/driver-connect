import { requireDriver } from "@/lib/driver-session";
import { db } from "@/lib/db";
import { PhotoManager } from "@/components/gallery/photo-manager";
export default async function PhotosPage() {
  const actor = await requireDriver(), photos = await db().driverPhoto.findMany({ where: { driverId: actor.driverId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, caption: true, category: true, width: true, height: true } });
  return <><div className="workspace-heading"><div><span className="eyebrow">TU TRABAJO, EN IMÁGENES</span><h1>Mis fotos<span>.</span></h1><p>Comparte tus viajes y presenta tu vehículo.</p></div></div><PhotoManager photos={photos} published={actor.published} slug={actor.slug} /></>;
}
