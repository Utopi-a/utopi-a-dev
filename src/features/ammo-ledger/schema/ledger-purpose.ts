/** 実包管理帳簿の用途区分（警察の実務では分冊管理が推奨される） */
export const ledgerPurposes = ["shooting", "hunting", "pest_control"] as const;

export type LedgerPurpose = (typeof ledgerPurposes)[number];

export const ledgerPurposeLabels: Record<LedgerPurpose, string> = {
  shooting: "射撃用",
  hunting: "狩猟用",
  pest_control: "有害鳥獣駆除用",
};

/** 画面内タブなど、短い表示向け（「用」なし） */
export const ledgerPurposeTabLabels: Record<LedgerPurpose, string> = {
  shooting: "射撃",
  hunting: "狩猟",
  pest_control: "有害鳥獣駆除",
};
