import { PublicDriverProfile } from "./public-driver-profile";
import type { PublicDriver } from "@/lib/public-driver";
const demo: PublicDriver = {
  slug: "demo", name: "Daniel Ríos", location: "Ciudad de Panamá", experience: 7, languages: ["Español", "English"],
  phone: null, whatsapp: null, email: null, photoUrl: null, verified: false, bookingEnabled: false, headline: null, headlineEn: null,
  description: "Traslados privados en Panamá, con atención a los detalles y un trato cercano. Del aeropuerto a tu próxima reunión: disfruta el camino, yo me encargo del recorrido.",
  descriptionEn: "Private transfers in Panama with thoughtful service. From the airport to your next meeting: enjoy the journey while I take care of the route.",
  photos: [],
  services: [
    { nameEn: "Airport transfers", descriptionEn: "Tocumen arrivals and departures coordinated with your itinerary. Start your journey at ease.", name: "Traslados al aeropuerto", icon: "plane", photoUrl: null, description: "Llegadas y salidas de Tocumen, coordinadas con tu itinerario. Tu viaje comienza con calma." },
    { nameEn: "Executive transfers", descriptionEn: "A private driver for your meetings and business journeys, with room to focus on your day.", name: "Traslados ejecutivos", icon: "briefcase", photoUrl: null, description: "Un conductor para tus reuniones, compromisos y recorridos de trabajo. Espacio para seguir con tu día." },
    { nameEn: "City tours", descriptionEn: "Discover Panama at your own pace with a private tour and time to enjoy every stop.", name: "Recorridos por la ciudad", icon: "compass", photoUrl: null, description: "Descubre Panamá a tu ritmo, con un recorrido privado y tiempo para disfrutar cada parada." },
  ],
  vehicles: [{ brand: "SUV", model: "ejecutivo", year: 2024, color: "Azul oscuro", colorEn: "Dark blue", descriptionEn: "An illustrative vehicle offering comfort, space and attention to detail throughout your journey.", passengers: 3, description: "Un vehículo de muestra para disfrutar el trayecto con comodidad, espacio y atención a los detalles.", photoUrl: "/images/demo-suv.png" }],
};
export function DriverProfile() { return <PublicDriverProfile driver={demo} demo />; }
