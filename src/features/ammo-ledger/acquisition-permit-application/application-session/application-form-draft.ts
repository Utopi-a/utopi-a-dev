import { z } from "zod";
import { acquisitionPermitPurposeOptions } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import { applicationAmmoNameOptions } from "../application-ammo-name/application-ammo-name";

export const applicationFormDraftKey = "ammo-ledger:acquisition-permit-application-draft";

const applicationFormDraftSchema = z.object({
  prefectureName: z.string(),
  applicationDate: z.string(),
  ownerName: z.string(),
  ownerFurigana: z.string(),
  ownerAddress: z.string(),
  ownerBirthDate: z.string(),
  ownerPhone: z.string(),
  possessionPermitCertificateNumber: z.string(),
  ammoName: z.enum(applicationAmmoNameOptions),
  permitPurpose: z.enum(acquisitionPermitPurposeOptions),
  requestedQuantity: z.string(),
  /** 手で直した現保有数量。null の間は選んだ名称に当たる帳簿の在庫を使い、名称の変更に追随する。 */
  homeStockOverride: z.string().nullable(),
  validFrom: z.string(),
  validTo: z.string(),
  storageLocation: z.string(),
  selectedGunIds: z.array(z.string()),
  counterparty: z.object({ id: z.string(), name: z.string(), address: z.string() }).nullable(),
  rangeAllocationRows: z.array(
    z.object({
      id: z.string(),
      rangeId: z.string(),
      rangeName: z.string(),
      rangeAddress: z.string(),
      weight: z.string(),
    }),
  ),
  /** 消費計画を生成したときの計画入力。今の入力と一致する間だけ計画を有効にする。 */
  planInputKey: z.string().nullable(),
});

/** 申請書の入力画面の状態。印刷画面から戻ったときに入力を続けられるよう保存する。 */
export type ApplicationFormDraft = z.infer<typeof applicationFormDraftSchema>;

// 氏名・住所・生年月日・許可証番号を含むため、タブを閉じれば消える sessionStorage に置く。
// 保存・読込に失敗しても入力は続けられるので、例外や壊れた値は「下書きなし」として扱う。
export function loadApplicationFormDraft(): ApplicationFormDraft | null {
  try {
    const raw = sessionStorage.getItem(applicationFormDraftKey);
    if (!raw) {
      return null;
    }
    const parsed = applicationFormDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveApplicationFormDraft({ draft }: { draft: ApplicationFormDraft }): void {
  try {
    sessionStorage.setItem(applicationFormDraftKey, JSON.stringify(draft));
  } catch {
    // 容量超過やストレージ無効でも入力・印刷は続けられる。
  }
}

export function clearApplicationFormDraft(): void {
  try {
    sessionStorage.removeItem(applicationFormDraftKey);
  } catch {
    // 消せなくても、次に保存する時点で上書きされる。
  }
}
