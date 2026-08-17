import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { isCounterpartyCategory } from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";

export type CounterpartyReference = {
  symbol: string;
  name: string;
  address: string | null;
};

function buildReferenceSymbol({ index }: { index: number }): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < letters.length) {
    return letters[index];
  }
  return `${letters[Math.floor(index / letters.length) - 1]}${letters[index % letters.length]}`;
}

function buildCounterpartyKey({ name, address }: { name: string; address: string | null }): string {
  return `${name}\0${address ?? ""}`;
}

export function buildCounterpartyReferences({
  entries,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
}): {
  references: CounterpartyReference[];
  referenceByKey: Map<string, string>;
} {
  const seen = new Map<string, CounterpartyReference>();
  const referenceByKey = new Map<string, string>();

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

    const index = seen.size;
    const symbol = buildReferenceSymbol({ index });
    seen.set(key, { symbol, name: entry.counterpartyName, address: entry.counterpartyAddress });
    referenceByKey.set(key, symbol);
  }

  return { references: [...seen.values()], referenceByKey };
}

export function resolveCounterpartySymbol({
  counterpartyName,
  counterpartyAddress,
  referenceByKey,
}: {
  counterpartyName: string | null;
  counterpartyAddress: string | null;
  referenceByKey: Map<string, string>;
}): string | null {
  if (!counterpartyName) {
    return null;
  }

  const key = buildCounterpartyKey({ name: counterpartyName, address: counterpartyAddress });
  return referenceByKey.get(key) ?? null;
}
