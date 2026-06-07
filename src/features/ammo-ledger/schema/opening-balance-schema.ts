import { z } from "zod";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import { acquisitionPermitNameOptions } from "./acquisition-permit-name-options";
import { acquisitionPermitPurposeOptions } from "./acquisition-permit-purpose-options";
import { ledgerPurposes } from "./ledger-purpose";

export const openingBalancePermitCarryoverSchema = z.object({
  permitId: z.string().optional(),
  name: z.enum(acquisitionPermitNameOptions),
  permitPurpose: z.enum(acquisitionPermitPurposeOptions),
  quantity: z.number().int().positive(),
  expiresOn: z.string().date(),
});

export const openingBalanceInputSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    purpose: z.enum(ledgerPurposes),
    permitCarryovers: z.array(openingBalancePermitCarryoverSchema),
    stockByAmmoType: z.record(z.string(), z.number().int().min(0)),
  })
  .superRefine((data, ctx) => {
    const openingDay = buildYearOpeningDay({ year: data.year });

    for (const [index, carryover] of data.permitCarryovers.entries()) {
      if (carryover.expiresOn < openingDay) {
        ctx.addIssue({
          code: "custom",
          message: "有効期限は繰越日（1月1日）以降にしてください",
          path: ["permitCarryovers", index, "expiresOn"],
        });
      }
    }
  });

export type OpeningBalanceInput = z.infer<typeof openingBalanceInputSchema>;
export type OpeningBalancePermitCarryoverInput = z.infer<
  typeof openingBalancePermitCarryoverSchema
>;
