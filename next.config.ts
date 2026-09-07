import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Usar la API del compilador de TypeScript 5 en entornos con procesos aislados.
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
