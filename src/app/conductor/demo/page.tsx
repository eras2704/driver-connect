import type { Metadata } from "next";
import { DriverProfile } from "@/components/driver-profile";
export const metadata: Metadata = {
  title: "Daniel Ríos · Perfil de muestra | Driver Connect",
  description: "Perfil ficticio de muestra de Driver Connect: conductor privado, servicios y vehículo en Panamá.",
};
export default function DemoProfile() { return <DriverProfile />; }
