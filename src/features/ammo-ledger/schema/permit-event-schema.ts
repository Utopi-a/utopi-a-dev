import { z } from "zod";
import { ledgerPurposes } from "./ledger-purpose";
import { permitEventKinds } from "./permit-event-kind";

export const permitEventInputSchema = z.object({
  purpose: z.enum(ledgerPurposes),
  eventKind: z.enum(permitEventKinds),
  occurredOn: z.string().date(),
  quantity: z.number().int().min(0),
  memo: z.string().max(500).optional(),
});

export type PermitEventInput = z.infer<typeof permitEventInputSchema>;
