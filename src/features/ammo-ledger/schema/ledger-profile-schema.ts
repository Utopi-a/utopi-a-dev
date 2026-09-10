import { z } from "zod";

export const ledgerProfileSchema = z.object({
  ownerName: z.string().min(1).max(100),
  ownerFurigana: z.string().trim().max(100).optional(),
  possessionPermitCertificateNumber: z.string().trim().max(100).optional(),
  ownerAddress: z.string().max(300).optional(),
  ownerBirthDate: z.string().date().optional(),
  ownerPhone: z.string().max(20).optional(),
});

export type LedgerProfileInput = z.infer<typeof ledgerProfileSchema>;
