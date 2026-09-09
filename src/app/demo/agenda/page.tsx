import type { Metadata } from "next";
import { PortalShell } from "@/components/driver/portal-shell";
import { AgendaView, type AgendaTrip } from "@/components/driver/agenda-view";
import { monthRange, parsePanamaDate } from "@/lib/calendar";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agenda de muestra | Driver Connect", description: "Conoce el espacio del conductor con datos ficticios.", robots: { index: false, follow: false } };
export default async function DemoAgenda({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string; estado?: string }> }) {
  const params = await searchParams, { month } = monthRange(params.mes), pendingOnly = params.estado === "PENDING";
  const trips: AgendaTrip[] = [
    { id: "demo-a", customerName: "Isabel Torres", serviceName: "Traslado al aeropuerto", pickup: "Hotel en Obarrio", destination: "Aeropuerto de Tocumen", startsAt: parsePanamaDate(`${month}-12T08:30`), endsAt: parsePanamaDate(`${month}-12T09:30`), status: "CONFIRMED", passengers: 2 },
    { id: "demo-b", customerName: "Carlos Méndez", serviceName: "Traslado ejecutivo", pickup: "Costa del Este", destination: "Centro de la ciudad", startsAt: parsePanamaDate(`${month}-12T14:00`), endsAt: parsePanamaDate(`${month}-12T15:00`), status: "PENDING", passengers: 1 },
    { id: "demo-c", customerName: "Lucía Moreno", serviceName: "Recorrido privado", pickup: "Casco Antiguo", destination: "Amador", startsAt: parsePanamaDate(`${month}-18T10:00`), endsAt: parsePanamaDate(`${month}-18T12:00`), status: "CONFIRMED", passengers: 3 },
    { id: "demo-d", customerName: "Andrés Silva", serviceName: "Traslado al aeropuerto", pickup: "Punta Pacífica", destination: "Aeropuerto de Tocumen", startsAt: parsePanamaDate(`${month}-23T06:00`), endsAt: parsePanamaDate(`${month}-23T07:00`), status: "PENDING", passengers: 2 },
  ];
  return <PortalShell name="Daniel Ríos" slug="demo" published demo><AgendaView trips={pendingOnly ? trips.filter(t => t.status === "PENDING") : trips} month={month} pending={2} total={pendingOnly ? 2 : 4} day={params.dia} pendingOnly={pendingOnly} demo /></PortalShell>;
}
