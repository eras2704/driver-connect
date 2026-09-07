import "server-only";
import { NextResponse } from "next/server";
import { authConfiguration, sameOrigin } from "./security";

export class HttpError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) { super(message); }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export async function handleApi(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, fields: error.fields }, error.status);
    // Nunca registrar payloads, URLs de conexión, credenciales ni errores SQL con datos.
    console.error("No se pudo completar una operación administrativa.");
    return json({ error: "No pudimos completar la operación. Inténtalo de nuevo." }, 503);
  }
}
export function assertOrigin(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), authConfiguration().origin)) throw new HttpError(403, "Origen de la solicitud no permitido.");
}
export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "Se requiere JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Solicitud vacía.");
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 32_768) { await reader.cancel(); throw new HttpError(413, "La solicitud es demasiado grande."); }
      parts.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "El contenido no es JSON válido.");
  } finally { reader.releaseLock(); }
}
