"use client";
import { useEffect, useSyncExternalStore } from "react";
import { detectPublicLanguage, isPublicLanguage, publicLanguages, translatePublic, type PublicLanguage } from "@/lib/public-locale";
export type { PublicLanguage } from "@/lib/public-locale";
const KEY = "dc-public-language", EVENT = "dc-public-language-change";
let sessionLanguage: PublicLanguage | undefined;
function read(): PublicLanguage {
  if (sessionLanguage) return sessionLanguage;
  try { const saved = localStorage.getItem(KEY); if (isPublicLanguage(saved)) return saved; } catch { /* Device language still works without storage. */ }
  return detectPublicLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) { sessionLanguage = undefined; callback(); } };
  window.addEventListener(EVENT, callback); window.addEventListener("storage", storage); window.addEventListener("languagechange", callback);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", storage); window.removeEventListener("languagechange", callback); };
}
export function usePublicLanguage(enabled = true, updateDocument = true) {
  const stored = useSyncExternalStore(subscribe, read, () => "es" as PublicLanguage);
  const language = enabled ? stored : "es";
  useEffect(() => { if (!enabled || !updateDocument) return; const previous = document.documentElement.lang; document.documentElement.lang = language; return () => { document.documentElement.lang = previous; }; }, [language, enabled, updateDocument]);
  return { language, t: (spanish: string, english: string) => translatePublic(language, spanish, english) };
}
export function PublicLanguageSelect({ language }: { language: PublicLanguage }) {
  const names = { es: "Español", en: "English", de: "Deutsch", fr: "Français", pt: "Português" };
  return <label className="public-language-select"><span className="sr-only">Idioma / Language</span><select aria-label="Idioma / Language" value={language} onChange={event => { if (!isPublicLanguage(event.target.value)) return; sessionLanguage = event.target.value; try { localStorage.setItem(KEY, sessionLanguage); } catch { /* Keep this session preference when storage is unavailable. */ } window.dispatchEvent(new Event(EVENT)); }}>{publicLanguages.map(code => <option key={code} value={code}>{names[code]}</option>)}</select></label>;
}
