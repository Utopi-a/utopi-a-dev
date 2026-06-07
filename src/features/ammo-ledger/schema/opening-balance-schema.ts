import { z } from "zod";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import { ledgerPurposes } from "./ledger-purpose";

export const openingBalanceInputSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    purpose: z.enum(ledgerPurposes),
    permitBalance: z.number().int().min(0).nullable(),
    permitExpiresOn: z.string().date().nullable(),
    stockByAmmoType: z.record(z.string(), z.number().int().min(0)),
  })
  .superRefine((data, ctx) => {
    if (data.permitBalance === null || data.permitBalance <= 0) {
      return;
    }

    const openingDay = buildYearOpeningDay({ year: data.year });

    if (!data.permitExpiresOn) {
      ctx.addIssue({
        code: "custom",
        message: "許可残数を入力する場合は有効期限が必要です",
        path: ["permitExpiresOn"],
      });
      return;
    }

    if (data.permitExpiresOn < openingDay) {
      ctx.addIssue({
        code: "custom",
        message: "有効期限は繰越日（1月1日）以降にしてください",
        path: ["permitExpiresOn"],
      });
    }
  });

export type OpeningBalanceInput = z.infer<typeof openingBalanceInputSchema>;
