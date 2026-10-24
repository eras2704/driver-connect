import { publicTranslations } from "./public-translations";

export const publicLanguages = ["es", "en", "de", "fr", "pt"] as const;
export type PublicLanguage = typeof publicLanguages[number];
export function isPublicLanguage(value: unknown): value is PublicLanguage {
  return typeof value === "string" && publicLanguages.includes(value as PublicLanguage);
}
// Respect browser preference order; an unsupported language may have a supported fallback.
export function detectPublicLanguage(languages: readonly string[]): PublicLanguage {
  for (const tag of languages) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (isPublicLanguage(base)) return base;
  }
  return "en";
}
export function translatePublic(language: PublicLanguage, spanish: string, english: string): string {
  if (language === "es") return spanish;
  if (language === "en") return english;
  return publicTranslations[english]?.[language] || english;
}
