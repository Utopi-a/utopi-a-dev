import { z } from "zod";
import type { LedgerPurpose } from "./ledger-purpose";

/**
 * 無許可譲受の上限（猟銃用火薬類等の譲渡、譲受け、輸入及び消費に関する内閣府令4条）。
 * 狩猟者登録・捕獲許可の有効期間につき、実包300個（うちライフル実包50個）まで。
 * 銃用雷管・火薬の上限もあるが、この帳簿は実包だけを扱う。
 */
export const unlicensedAcquisitionRoundLimit = 300;
export const unlicensedAcquisitionRifleRoundLimit = 50;

/** 帳簿と許可の一覧で、無許可譲受の枠に付ける名称 */
export const unlicensedAcquisitionPermitName = "無許可譲受";

/** 無許可譲受は鳥獣の捕獲が目的のときだけ（火薬類取締法17条1項3号）。射撃用には使えない */
export const unlicensedAcquisitionPurposes = [
  "hunting",
  "pest_control",
] as const satisfies readonly LedgerPurpose[];

export type UnlicensedAcquisitionPurpose = (typeof unlicensedAcquisitionPurposes)[number];

export function isUnlicensedAcquisitionPurpose(
  purpose: LedgerPurpose,
): purpose is UnlicensedAcquisitionPurpose {
  return (unlicensedAcquisitionPurposes as readonly LedgerPurpose[]).includes(purpose);
}

/** 無許可譲受の根拠になる登録・許可の呼び名 */
export const unlicensedAcquisitionBasisLabels: Record<UnlicensedAcquisitionPurpose, string> = {
  hunting: "狩猟者登録",
  pest_control: "鳥獣の捕獲許可",
};

export const unlicensedAcquisitionQuotaInputSchema = z
  .object({
    ledgerPurpose: z.enum(unlicensedAcquisitionPurposes),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    memo: z.string().max(500).optional(),
  })
  .refine(({ startsOn, endsOn }) => endsOn >= startsOn, {
    message: "有効期間の終わりは始まり以降にしてください",
    path: ["endsOn"],
  });

export type UnlicensedAcquisitionQuotaInput = z.infer<typeof unlicensedAcquisitionQuotaInputSchema>;
