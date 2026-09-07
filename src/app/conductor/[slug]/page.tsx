import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicDriver } from "@/lib/public-driver";
import { PublicDriverProfile } from "@/components/public-driver-profile";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const driver = await publicDriver((await params).slug);
  return { title: driver ? `${driver.name} | Driver Connect` : "Perfil no disponible | Driver Connect", description: driver ? `Perfil de ${driver.name}${driver.location ? ` en ${driver.location}` : ""}. Consulta sus servicios y datos de contacto.` : "Este perfil no está disponible." };
}
export default async function DriverPage({ params }: { params: Promise<{ slug: string }> }) {
  const driver = await publicDriver((await params).slug);
  if (!driver) notFound();
  return <PublicDriverProfile driver={driver} />;
}
