import { isCounterpartyCategory } from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";

function joinNonEmpty({ parts }: { parts: (string | null | undefined)[] }): string {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => !!p)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(" ");
}

export function formatLedgerRemarks({
  category,
  location,
  ledgerNote,
  counterpartyName,
}: {
  category: string;
  location: string | null | undefined;
  ledgerNote: string | null | undefined;
  counterpartyName: string | null | undefined;
}): string {
  if (category === "consume") {
    return joinNonEmpty({ parts: [location, ledgerNote] });
  }

  if (isCounterpartyCategory({ category })) {
    return joinNonEmpty({ parts: [counterpartyName, ledgerNote] });
  }

  return joinNonEmpty({ parts: [ledgerNote] });
}
