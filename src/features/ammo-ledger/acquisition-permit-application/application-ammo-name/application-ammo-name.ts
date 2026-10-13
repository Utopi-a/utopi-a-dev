import type { AcquisitionPermitName } from "@/features/ammo-ledger/schema/acquisition-permit-name-options";

/**
 * 申請書に重ねて印刷できる火薬類の名称。
 * 様式の名称・数量欄のうち印字位置を持つのは実包の列だけなので、
 * 空包・銃用雷管・無煙火薬・黒色猟用火薬を選ぶと実包の欄に印字されてしまう。
 */
export const applicationAmmoNameOptions = [
  "12番",
  "20番",
  "410番",
  "実包（ライフル）",
] as const satisfies readonly AcquisitionPermitName[];

export type ApplicationAmmoName = (typeof applicationAmmoNameOptions)[number];

export const defaultApplicationAmmoName: ApplicationAmmoName = "12番";
