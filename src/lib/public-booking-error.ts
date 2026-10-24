import { translatePublic, type PublicLanguage } from "./public-locale";

const messages: Record<string, string> = {
  "Elige una fecha futura dentro de los próximos doce meses.": "Choose a future date within the next twelve months.",
  "La cantidad de pasajeros supera la capacidad del vehículo.": "The number of passengers exceeds the vehicle capacity.",
  "Este conductor o servicio no recibe solicitudes en este momento.": "This driver or service is not accepting requests right now.",
  "Perfil no disponible.": "This profile is unavailable.",
  "Revisa los datos del viaje y el consentimiento.": "Check your trip details and consent.",
  "Esta solicitud ya se recibió con otros datos. Abre el formulario de nuevo para solicitar otro viaje.": "This request was already received with different details. Reopen the form to request another trip.",
  "La solicitud ya existe. Revisa sus datos.": "This request already exists. Check its details.",
};
export function publicBookingError(language: PublicLanguage, error: unknown, status: number) {
  const spanish = typeof error === "string" ? error : "";
  if (language === "es" && spanish) return spanish;
  if (messages[spanish]) return translatePublic(language, spanish, messages[spanish]);
  if (status === 429) return translatePublic(language, "Demasiadas solicitudes. Espera un momento y vuelve a intentar.", "Too many requests. Wait a moment and try again.");
  return translatePublic(language, "No se pudo guardar el viaje. Revisa los datos e intenta de nuevo.", "Could not save your trip. Please try again.");
}
