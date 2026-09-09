import { requireDriver } from "@/lib/driver-session";
import { TripForm } from "@/components/booking/trip-form";
export default async function NewTripPage() { await requireDriver(); return <><div className="workspace-heading"><div><span className="eyebrow">PREPARA TU PRÓXIMO DESTINO</span><h1>Nuevo viaje<span>.</span></h1><p>Registra un traslado ya acordado con el pasajero.</p></div></div><TripForm /></>; }
