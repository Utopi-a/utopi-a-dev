export const ledgerCategories = [
  "acquire",
  "consume",
  "transfer",
  "dispose",
  "manufacture",
  "carryover",
] as const;

export type LedgerCategory = (typeof ledgerCategories)[number];

export const ledgerCategoryLabels: Record<LedgerCategory, string> = {
  acquire: "譲受",
  consume: "消費",
  transfer: "譲渡",
  dispose: "廃棄",
  manufacture: "製造",
  carryover: "繰越",
};
