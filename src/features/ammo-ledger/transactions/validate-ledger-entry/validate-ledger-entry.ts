import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export type LedgerEntryForValidation = {
  category: LedgerCategory;
  occurredOn: string | null;
  ammoTypeId: string | null;
  quantity: number | null;
  location: string | null;
  counterpartyName: string | null;
  counterpartyAddress: string | null;
  gunId: string | null;
  gunNumber: string | null;
  gunPermitNumber: string | null;
};

export type ValidationResult = {
  valid: boolean;
  missingFields: string[];
};

export function validateLedgerEntry(entry: LedgerEntryForValidation): ValidationResult {
  const missingFields: string[] = [];

  if (!entry.occurredOn) {
    missingFields.push("日付");
  }
  if (!entry.ammoTypeId) {
    missingFields.push("実包の種類");
  }
  if (!entry.quantity || entry.quantity <= 0) {
    missingFields.push("数量");
  }

  switch (entry.category) {
    case "consume":
      if (!entry.location) {
        missingFields.push("消費場所");
      }
      if (!entry.gunId) {
        missingFields.push("使用銃");
      }
      if (!entry.gunNumber) {
        missingFields.push("使用銃の銃番号");
      }
      if (!entry.gunPermitNumber) {
        missingFields.push("使用銃の許可番号等");
      }
      break;
    case "acquire":
    case "transfer":
      if (!entry.counterpartyName) {
        missingFields.push("相手方氏名");
      }
      if (!entry.counterpartyAddress) {
        missingFields.push("相手方住所");
      }
      break;
    case "dispose":
    case "manufacture":
      break;
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
