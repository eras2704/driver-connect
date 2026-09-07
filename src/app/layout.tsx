import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Driver Connect",
  description: "Perfiles profesionales de conductores y acceso mediante tarjetas NFC.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
