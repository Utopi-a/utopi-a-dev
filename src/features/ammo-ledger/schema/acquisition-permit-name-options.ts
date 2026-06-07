/**
 * 譲受許可証・申請書（別記様式第2号）の火薬類の名称。
 *
 * 根拠:
 * - 火薬類取締法・猟銃用火薬類等府令上の区分は実包・空包・銃用雷管・無煙火薬・黒色猟用火薬
 * - 散弾銃用実包は適合実包の番径（12番・20番・410番）で許可される（国内で一般的な口径）
 * - ライフル銃用は番径ではなくライフル実包として別枠
 *
 * 含めないもの: 11番（国内では一般的な許可口径ではない）、10番（専業漁業等の特例）、その他
 */
export const acquisitionPermitNameOptions = [
  "12番",
  "20番",
  "410番",
  "実包（ライフル）",
  "空包",
  "銃用雷管",
  "無煙火薬",
  "黒色猟用火薬",
] as const;

export type AcquisitionPermitName = (typeof acquisitionPermitNameOptions)[number];

export const defaultAcquisitionPermitName: AcquisitionPermitName = "12番";
