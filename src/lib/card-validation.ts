import { z } from "zod";
import { slugSchema } from "./validation";

const reference = z.string().trim().min(3).max(191);
export const cardOperationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), requestId: z.uuid(), reference, normalConfirmed: z.literal(true) }).strict(),
  z.object({ action: z.literal("complete"), requestId: z.uuid(), upgradeId: z.uuid(), premiumTested: z.literal(true), normalReturned: z.literal(true) }).strict(),
  z.object({ action: z.literal("assign"), requestId: z.uuid(), slug: slugSchema, reference, nfcRewritten: z.literal(true) }).strict(),
]);
export type CardOperation = z.infer<typeof cardOperationSchema>;
