import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";

type PermitEventRow = {
  occurredOn: string;
  eventKind: PermitEventKind;
  quantity: number;
};

type LedgerRow = {
  id: string;
  category: LedgerCategory;
  quantity: number;
} & import("@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries").LedgerEntrySortKey;

const permitConsumingCategories: LedgerCategory[] = ["acquire"];

function compareDate({ a, b }: { a: string; b: string }): number {
  return a.localeCompare(b);
}

export function computeRunningPermitBalance({
  permitEvents,
  ledgerEntries,
}: {
  permitEvents: PermitEventRow[];
  ledgerEntries: LedgerRow[];
}): Map<string, number> {
  const balanceByEntryId = new Map<string, number>();
  let balance = 0;

  const sortedEvents = [...permitEvents].sort((a, b) =>
    compareDate({ a: a.occurredOn, b: b.occurredOn }),
  );
  const sortedEntries = [...ledgerEntries].sort((a, b) => compareLedgerEntries({ a, b }));

  let eventIndex = 0;

  for (const entry of sortedEntries) {
    while (
      eventIndex < sortedEvents.length &&
      compareDate({ a: sortedEvents[eventIndex].occurredOn, b: entry.occurredOn }) <= 0
    ) {
      balance = applyPermitEvent({
        balance,
        eventKind: sortedEvents[eventIndex].eventKind,
        quantity: sortedEvents[eventIndex].quantity,
      });
      eventIndex += 1;
    }

    if (permitConsumingCategories.includes(entry.category)) {
      balance = Math.max(0, balance - entry.quantity);
    }

    balanceByEntryId.set(entry.id, balance);
  }

  return balanceByEntryId;
}

export function computeCurrentPermitBalance({
  permitEvents,
  ledgerEntries,
}: {
  permitEvents: PermitEventRow[];
  ledgerEntries: LedgerRow[];
}): number {
  let balance = 0;

  const sortedEvents = [...permitEvents].sort((a, b) =>
    compareDate({ a: a.occurredOn, b: b.occurredOn }),
  );
  const sortedEntries = [...ledgerEntries].sort((a, b) => compareLedgerEntries({ a, b }));

  let eventIndex = 0;

  for (const entry of sortedEntries) {
    while (
      eventIndex < sortedEvents.length &&
      compareDate({ a: sortedEvents[eventIndex].occurredOn, b: entry.occurredOn }) <= 0
    ) {
      balance = applyPermitEvent({
        balance,
        eventKind: sortedEvents[eventIndex].eventKind,
        quantity: sortedEvents[eventIndex].quantity,
      });
      eventIndex += 1;
    }

    if (permitConsumingCategories.includes(entry.category)) {
      balance = Math.max(0, balance - entry.quantity);
    }
  }

  while (eventIndex < sortedEvents.length) {
    balance = applyPermitEvent({
      balance,
      eventKind: sortedEvents[eventIndex].eventKind,
      quantity: sortedEvents[eventIndex].quantity,
    });
    eventIndex += 1;
  }

  return balance;
}

function applyPermitEvent({
  balance,
  eventKind,
  quantity,
}: {
  balance: number;
  eventKind: PermitEventKind;
  quantity: number;
}): number {
  switch (eventKind) {
    case "grant":
    case "carryover":
      return balance + quantity;
    case "expiry":
      return 0;
  }
}

export function filterByPurpose<T extends { purpose: LedgerPurpose | string }>({
  rows,
  purpose,
}: {
  rows: T[];
  purpose: LedgerPurpose;
}): T[] {
  return rows.filter((row) => row.purpose === purpose);
}
