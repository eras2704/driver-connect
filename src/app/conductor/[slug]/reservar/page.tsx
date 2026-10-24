import { serviceAvailable } from "@/lib/subscription";
import { driverAddressWhere } from "@/lib/driver-address";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PublicReservation } from "@/components/booking/public-reservation";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitar traslado | Driver Connect", description: "Coordina tu próximo viaje con tu conductor.", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ReservePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ servicio?: string }> }) {
  const { slug } = await params, selection = (await searchParams).servicio;
  if (slug === "demo" || !/^[a-z0-9-]{3,80}$/.test(slug)) notFound();
  const driver = await db().driver.findFirst({ where: driverAddressWhere(slug), select: { name: true, customServicesEnabled: true, customServices: { where: { active: true }, take: 5, select: { id: true, name: true, nameEn: true }, orderBy: { createdAt: "asc" } }, active: true, serviceStartsAt: true, serviceExpiresAt: true, user: { select: { active: true } }, services: { where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } } } });
  const services = driver?.customServicesEnabled ? driver.customServices : driver?.services.slice(0, 5);
  if (!driver?.active || !serviceAvailable(driver) || !driver.user?.active || !services?.length) notFound();
  return <PublicReservation slug={slug} driverName={driver.name} services={services} defaultServiceId={services.find(s => s.name === selection)?.id} />;
}
