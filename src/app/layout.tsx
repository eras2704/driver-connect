import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeControl } from "@/components/theme-control";
import { themeScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Daniel Ríos · Perfil de muestra | Driver Connect",
  description: "Perfil ficticio de muestra de Driver Connect: conductor privado, servicios y vehículo en Panamá.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#081728",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><ThemeControl />{children}</body></html>;
}
