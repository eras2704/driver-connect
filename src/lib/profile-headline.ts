import { translatePublic, type PublicLanguage } from "./public-locale";
export const DEFAULT_HEADLINE_ES = "Tu destino, en buenas manos.";
export const DEFAULT_HEADLINE_EN = "Your destination, in good hands.";
export function publicHeadline(profile: { headline?: string | null; headlineEn?: string | null }, language: PublicLanguage = "es") {
  return (language !== "es" ? profile.headlineEn?.trim() : "") || profile.headline?.trim() || translatePublic(language, DEFAULT_HEADLINE_ES, DEFAULT_HEADLINE_EN);
}
