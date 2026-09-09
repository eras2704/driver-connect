import { z } from "zod";
import { driverSchema } from "./validation";
import { parsePanamaDate } from "./calendar";
const line = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\u0000-\u001f\u007f]/.test(v), "No se permiten caracteres de control.");
const tripShape = {
  customerName: line(100), phone: driverSchema.shape.phone.refine(v => Boolean(v), "Indica un teléfono con código de país."),
  email: driverSchema.shape.email, pickup: line(250), destination: line(250),
  notes: z.string().trim().max(1000).default(""), passengers: z.number().int().min(1).max(50),
  startsAt: z.string().refine(v => { try { parsePanamaDate(v); return true; } catch { return false; } }, "Revisa la fecha y la hora de Panamá."),
};
export const requestBookingSchema = z.object({ ...tripShape, serviceId: line(191), requestId: z.uuid(), consent: z.literal(true, { error: "Acepta compartir estos datos con el conductor." }), website: z.literal("").default("") }).strict();
export const manualBookingSchema = z.object({ ...tripShape, serviceName: line(191), duration: z.number().int().min(15).max(1440) }).strict();
export const editBookingSchema = manualBookingSchema.extend({ version: z.number().int().min(0) }).strict();
export const bookingStatusSchema = z.object({ status: z.enum(["CONFIRMED", "CANCELLED", "REJECTED"]), version: z.number().int().min(0) }).strict();
export const driverProfileSchema = driverSchema.omit({ slug: true, active: true, verified: true }).strict();
export type ManualBookingInput = z.infer<typeof manualBookingSchema>;
export type RequestBookingInput = z.infer<typeof requestBookingSchema>;
