import { PublicDriverProfile } from "./public-driver-profile";
import type { PublicDriver } from "@/lib/public-driver";
const demo: PublicDriver = {
  slug: "demo", name: "Daniel Ríos", location: "Ciudad de Panamá", experience: 7, languages: ["Español", "English"],
  phone: null, whatsapp: null, email: null, photoUrl: null, verified: false, bookingEnabled: false,
  description: "Traslados privados en Panamá, con atención a los detalles y un trato cercano. Del aeropuerto a tu próxima reunión: disfruta el camino, yo me encargo del recorrido.",
  services: [
    { name: "Traslados al aeropuerto", icon: "plane", description: "Llegadas y salidas de Tocumen, coordinadas con tu itinerario. Tu viaje comienza con calma." },
    { name: "Traslados ejecutivos", icon: "briefcase", description: "Un conductor para tus reuniones, compromisos y recorridos de trabajo. Espacio para seguir con tu día." },
    { name: "Recorridos por la ciudad", icon: "compass", description: "Descubre Panamá a tu ritmo, con un recorrido privado y tiempo para disfrutar cada parada." },
  ],
  vehicles: [{ brand: "SUV", model: "ejecutivo", year: 2024, color: "Azul oscuro", passengers: 3, description: "Un vehículo de muestra para disfrutar el trayecto con comodidad, espacio y atención a los detalles.", photoUrl: "/images/demo-suv.png" }],
};
export function DriverProfile() { return <PublicDriverProfile driver={demo} demo />; }
