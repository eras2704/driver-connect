import Link from "next/link";
export default async function ConnectionResult({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const cancelled = (await searchParams).estado === "cancelado";
  return <main className="private-booking"><section className="detail-card"><h1>{cancelled ? "Conexión cancelada" : "No pudimos conectar"}<span>.</span></h1><p>{cancelled ? "No se ha conectado tu cuenta. Puedes intentarlo de nuevo cuando quieras." : "Vuelve a tu enlace del viaje o al panel e inténtalo de nuevo. Usa el mismo navegador y acepta los permisos del calendario."}</p><Link className="button button-secondary" href="/panel/calendario">Volver a mi calendario de conductor</Link></section></main>;
}
