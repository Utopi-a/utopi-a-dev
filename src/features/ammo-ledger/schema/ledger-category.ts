export const ledgerCategories = [
  "acquire",
  "consume",
  "transfer",
  "dispose",
  "manufacture",
  "issue",
  "receive",
  "carryover",
] as const;

export type LedgerCategory = (typeof ledgerCategories)[number];

export const ledgerCategoryLabels: Record<LedgerCategory, string> = {
  acquire: "譲受",
  consume: "消費",
  transfer: "譲渡",
  dispose: "廃棄",
  manufacture: "製造",
  issue: "交付",
  receive: "被交付",
  carryover: "繰越",
};
