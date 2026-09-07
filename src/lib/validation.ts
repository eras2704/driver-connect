import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).default("");
const phone = optionalText(32).transform((value) => value.replace(/[ ()-]/g, ""))
  .refine((value) => !value || /^\+[1-9]\d{6,14}$/.test(value), "Usa el código de país, por ejemplo +507 6000 0000.");
const photo = optionalText(2048).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "La fotografía debe ser un enlace HTTPS válido.");

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,63}$/, "Usa de 3 a 64 letras, números, puntos o guiones.");
export const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa letras minúsculas, números y guiones.")
  .min(3).max(80).refine((value) => !["demo", "admin", "api", "login-admin", "panel"].includes(value), "Esta dirección está reservada.");
export const loginSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(200) }).strict();
export const driverSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2, "Escribe el nombre del conductor.").max(191),
  phone, whatsapp: phone,
  email: optionalText(191).refine((value) => !value || z.email().safeParse(value).success, "Escribe un correo válido."),
  location: optionalText(191),
  experience: z.number().int().min(0).max(70),
  languages: z.array(z.string().trim().min(1).max(40)).max(10),
  description: optionalText(3000),
  photoUrl: photo,
  active: z.boolean(),
  verified: z.boolean(),
  serviceIds: z.array(z.string().min(1).max(191)).max(20).transform((ids) => [...new Set(ids)]),
  vehicle: z.object({
    brand: z.string().trim().min(1).max(100),
    model: z.string().trim().min(1).max(100),
    year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
    color: optionalText(64), plate: optionalText(32),
    passengers: z.number().int().min(1).max(50),
    description: optionalText(1000), photoUrl: photo,
  }).strict().nullable(),
}).strict();

export type DriverInput = z.infer<typeof driverSchema>;
export function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
}
