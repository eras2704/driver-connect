import { DriverForm } from "@/components/admin/driver-form";
import { editorData } from "@/lib/drivers";
export default async function NewDriverPage() {
  const { services } = await editorData();
  return <><div className="admin-heading"><div><span className="eyebrow">NUEVO PERFIL</span><h1>Presenta a tu conductor.</h1><p>Puedes guardar un borrador y publicarlo cuando esté listo.</p></div></div><DriverForm services={services} /></>;
}
