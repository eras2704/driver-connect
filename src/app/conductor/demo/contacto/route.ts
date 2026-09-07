export function GET() {
  const vcard = ["BEGIN:VCARD", "VERSION:3.0", "N:Ríos;Daniel;;;", "FN:Daniel Ríos (muestra)", "ORG:Driver Connect - Demostración", "TITLE:Conductor privado - Perfil ficticio", "NOTE:Perfil ficticio. Sin teléfono ni correo reales.", "END:VCARD", ""].join("\r\n");
  return new Response(vcard, { headers: {
    "Content-Type": "text/vcard; charset=utf-8",
    "Content-Disposition": 'attachment; filename="daniel-rios-muestra.vcf"',
    "X-Content-Type-Options": "nosniff",
  } });
}
