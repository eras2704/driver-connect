"use client";
import { useEffect, useSyncExternalStore } from "react";
const KEY = "dc-public-language", EVENT = "dc-public-language-change";
let sessionLanguage: PublicLanguage | undefined;
export type PublicLanguage = "es" | "en";
function read(): PublicLanguage { if (sessionLanguage) return sessionLanguage; try { return localStorage.getItem(KEY) === "en" ? "en" : "es"; } catch { return "es"; } }
function subscribe(callback: () => void) { window.addEventListener(EVENT, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", callback); }; }
export function usePublicLanguage(enabled = true, updateDocument = true) {
  const stored = useSyncExternalStore(subscribe, read, () => "es" as PublicLanguage);
  const language = enabled ? stored : "es";
  useEffect(() => { if (!enabled || !updateDocument) return; const previous = document.documentElement.lang; document.documentElement.lang = language; return () => { document.documentElement.lang = previous; }; }, [language, enabled, updateDocument]);
  return { language, t: (spanish: string, english: string) => language === "en" ? english : spanish };
}
export function PublicLanguageSelect({ language }: { language: PublicLanguage }) {
  return <label className="public-language-select"><span className="sr-only">Idioma / Language</span><select aria-label="Idioma / Language" value={language} onChange={event => { sessionLanguage = event.target.value === "en" ? "en" : "es"; try { localStorage.setItem(KEY, sessionLanguage); } catch { /* Keep this session preference when storage is unavailable. */ } window.dispatchEvent(new Event(EVENT)); }}><option value="es">Español</option><option value="en">English</option></select></label>;
}
