/**
 * 譲受の枠の種類。
 * - permit: 公安委員会の譲受許可（火薬類取締法17条1項本文）
 * - unlicensed: 狩猟者登録・鳥獣の捕獲許可による無許可譲受（同項3号）
 */
export const acquisitionPermitKinds = ["permit", "unlicensed"] as const;

export type AcquisitionPermitKind = (typeof acquisitionPermitKinds)[number];

export function isUnlicensedAcquisitionPermit({ kind }: { kind: string }): boolean {
  return kind === "unlicensed";
}
