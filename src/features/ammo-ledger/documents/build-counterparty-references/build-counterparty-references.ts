import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { isCounterpartyCategory } from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";

export type CounterpartyReference = {
  name: string;
  address: string | null;
};

function buildCounterpartyKey({ name, address }: { name: string; address: string | null }): string {
  return `${name}\0${address ?? ""}`;
}

export function buildCounterpartyReferences({
  entries,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
}): CounterpartyReference[] {
  const seen = new Set<string>();
  const references: CounterpartyReference[] = [];

  for (const entry of entries) {
    if (!isCounterpartyCategory({ category: entry.category })) {
      continue;
    }
    if (!entry.counterpartyName) {
      continue;
    }

    const key = buildCounterpartyKey({
      name: entry.counterpartyName,
      address: entry.counterpartyAddress,
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    references.push({
      name: entry.counterpartyName,
      address: entry.counterpartyAddress,
    });
  }

  return references;
}
