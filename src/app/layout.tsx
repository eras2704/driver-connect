import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daniel Ríos · Perfil de muestra | Driver Connect",
  description: "Perfil ficticio de muestra de Driver Connect: conductor privado, servicios y vehículo en Panamá.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#081728",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
