import { z } from "zod";
import { ledgerPurposes } from "./ledger-purpose";

export const openingBalanceInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  purpose: z.enum(ledgerPurposes),
  permitBalance: z.number().int().min(0).nullable(),
  stockByAmmoType: z.record(z.string(), z.number().int().min(0)),
});

export type OpeningBalanceInput = z.infer<typeof openingBalanceInputSchema>;
