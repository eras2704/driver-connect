export const DEFAULT_HEADLINE_ES = "Tu destino, en buenas manos.";
export const DEFAULT_HEADLINE_EN = "Your destination, in good hands.";
export function publicHeadline(profile: { headline?: string | null; headlineEn?: string | null }, language: "es" | "en" = "es") {
  return (language === "en" ? profile.headlineEn?.trim() : "") || profile.headline?.trim() || (language === "en" ? DEFAULT_HEADLINE_EN : DEFAULT_HEADLINE_ES);
}
