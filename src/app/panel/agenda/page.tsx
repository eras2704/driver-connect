import { driverAgenda } from "@/lib/bookings";
import { AgendaView } from "@/components/driver/agenda-view";
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string; estado?: string }> }) {
  const params = await searchParams, pendingOnly = params.estado === "PENDING";
  const { range, trips, pending, total } = await driverAgenda(typeof params.mes === "string" ? params.mes : undefined, pendingOnly);
  const day = typeof params.dia === "string" && params.dia.startsWith(range.month) && /^\d{4}-\d{2}-\d{2}$/.test(params.dia) ? params.dia : undefined;
  return <AgendaView trips={trips} month={range.month} pending={pending} total={total} day={day} pendingOnly={pendingOnly} />;
}
