import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export type LedgerEntryFlow = "receive" | "pay";

const receiveCategories: ReadonlySet<LedgerCategory> = new Set([
  "manufacture",
  "acquire",
  "receive",
  "carryover",
]);

const payCategories: ReadonlySet<LedgerCategory> = new Set([
  "transfer",
  "issue",
  "consume",
  "dispose",
]);

export function classifyLedgerEntryFlow({
  category,
  quantity,
}: {
  category: string;
  quantity: number;
}): LedgerEntryFlow {
  if (receiveCategories.has(category as LedgerCategory)) {
    return "receive";
  }

  if (payCategories.has(category as LedgerCategory)) {
    return "pay";
  }

  return quantity >= 0 ? "receive" : "pay";
}

const counterpartyCategories: ReadonlySet<LedgerCategory> = new Set([
  "acquire",
  "transfer",
  "receive",
  "issue",
]);

export function isCounterpartyCategory({ category }: { category: string }): boolean {
  return counterpartyCategories.has(category as LedgerCategory);
}
