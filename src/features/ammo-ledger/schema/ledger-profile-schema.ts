import { z } from "zod";

export const ledgerProfileSchema = z.object({
  ownerName: z.string().min(1).max(100),
  ownerAddress: z.string().max(300).optional(),
});

export type LedgerProfileInput = z.infer<typeof ledgerProfileSchema>;
