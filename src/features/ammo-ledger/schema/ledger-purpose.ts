/** 実包管理帳簿の用途区分（警察の実務では分冊管理が推奨される） */
export const ledgerPurposes = ["shooting", "hunting", "pest_control"] as const;

export type LedgerPurpose = (typeof ledgerPurposes)[number];

export const ledgerPurposeLabels: Record<LedgerPurpose, string> = {
  shooting: "射撃用",
  hunting: "狩猟用",
  pest_control: "有害鳥獣駆除用",
};
