/** 譲受許可申請の目的（消費計画・許可証記載に準拠） */
export const acquisitionPermitPurposeOptions = [
  "標的射撃",
  "射撃競技",
  "狩猟（鳥獣の捕獲）",
  "有害鳥獣の駆除",
  "技能検定・教習",
  "実験・研究",
  "その他",
] as const;

export type AcquisitionPermitPurpose = (typeof acquisitionPermitPurposeOptions)[number];

export const defaultAcquisitionPermitPurpose: AcquisitionPermitPurpose = "標的射撃";
