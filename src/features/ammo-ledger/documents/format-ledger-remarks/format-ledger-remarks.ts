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
  counterpartySymbol,
}: {
  category: string;
  location: string | null | undefined;
  ledgerNote: string | null | undefined;
  counterpartyName: string | null | undefined;
  counterpartySymbol: string | null | undefined;
}): string {
  if (category === "consume") {
    return joinNonEmpty({ parts: [location, ledgerNote] });
  }

  if (isCounterpartyCategory({ category })) {
    const nameWithRef = counterpartyName
      ? counterpartySymbol
        ? `${counterpartyName}（相手方${counterpartySymbol}）`
        : counterpartyName
      : null;

    return joinNonEmpty({ parts: [nameWithRef, ledgerNote] });
  }

  return joinNonEmpty({ parts: [ledgerNote] });
}
