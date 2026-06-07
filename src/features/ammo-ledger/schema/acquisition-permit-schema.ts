import { z } from "zod";
import { acquisitionPermitNameOptions } from "./acquisition-permit-name-options";
import { acquisitionPermitPurposeOptions } from "./acquisition-permit-purpose-options";
import { ledgerPurposes } from "./ledger-purpose";

export const acquisitionPermitInputSchema = z
  .object({
    ledgerPurpose: z.enum(ledgerPurposes),
    name: z.enum(acquisitionPermitNameOptions),
    permitPurpose: z.enum(acquisitionPermitPurposeOptions),
    grantedOn: z.string().date(),
    expiresOn: z.string().date(),
    quantity: z.number().int().min(1),
    memo: z.string().max(500).optional(),
  })
  .refine(({ grantedOn, expiresOn }) => expiresOn >= grantedOn, {
    message: "有効期限は付与日以降にしてください",
    path: ["expiresOn"],
  });

export type AcquisitionPermitInput = z.infer<typeof acquisitionPermitInputSchema>;
