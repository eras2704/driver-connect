export function escapeVcard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}
function foldLine(value: string) {
  let line = "", length = 0;
  for (const char of value) {
    const bytes = Buffer.byteLength(char, "utf8");
    if (length + bytes > 75) { line += "\r\n "; length = 1; }
    line += char; length += bytes;
  }
  return line;
}
export function contactVcard(driver: { name: string; phone?: string | null; whatsapp?: string | null; email?: string | null; description?: string | null }, url: string) {
  return ["BEGIN:VCARD", "VERSION:3.0", `N:${escapeVcard(driver.name)};;;;`, `FN:${escapeVcard(driver.name)}`, "ORG:Driver Connect",
    ...(driver.phone || driver.whatsapp ? [`TEL;TYPE=CELL:${escapeVcard(driver.phone || driver.whatsapp || "")}`] : []),
    ...(driver.email ? [`EMAIL;TYPE=INTERNET:${escapeVcard(driver.email)}`] : []),
    ...(driver.description ? [`NOTE:${escapeVcard(driver.description)}`] : []),
    `URL:${escapeVcard(url)}`, "END:VCARD", ""].map(foldLine).join("\r\n");
}
