import QRCode from "qrcode";

export async function profileQr(origin: string, slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw new Error("Dirección de perfil inválida.");
  const url = new URL(`/conductor/${slug}`, origin).href;
  // Keep the white quiet zone intact, including when printing on dark cards.
  const options = { errorCorrectionLevel: "H" as const, margin: 4, color: { dark: "#000000", light: "#ffffff" } };
  const [svg, png] = await Promise.all([
    QRCode.toString(url, { ...options, type: "svg" }),
    QRCode.toDataURL(url, { ...options, type: "image/png", width: 1200 }),
  ]);
  return { url, png, svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` };
}
