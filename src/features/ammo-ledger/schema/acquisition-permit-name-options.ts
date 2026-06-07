/** 譲受許可証・申請書に記載する火薬類の名称（番径・種別） */
export const acquisitionPermitNameOptions = [
  "12番",
  "11番",
  "10番",
  "20番",
  "実包（ライフル）",
  "空包",
  "銃用雷管",
  "その他",
] as const;

export type AcquisitionPermitName = (typeof acquisitionPermitNameOptions)[number];

export const defaultAcquisitionPermitName: AcquisitionPermitName = "12番";
