import type { ammoLedgerEntry, ammoPermitEvent } from "@/db/schema/ammo-ledger";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type LedgerDisplayRow =
  | {
      kind: "permit_carryover";
      id: string;
      occurredOn: string;
      quantity: number;
    }
  | {
      kind: "entry";
      entry: typeof ammoLedgerEntry.$inferSelect;
    };

function compareDate({ a, b }: { a: string; b: string }): number {
  return a.localeCompare(b);
}

function isWithinRange({ date, from, to }: { date: string; from?: string; to?: string }): boolean {
  if (from && date < from) {
    return false;
  }
  if (to && date > to) {
    return false;
  }
  return true;
}

export function buildLedgerDisplayRows({
  entries,
  permitEvents,
  purpose,
  from,
  to,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  purpose: LedgerPurpose;
  from?: string;
  to?: string;
}): LedgerDisplayRow[] {
  const permitCarryovers = permitEvents
    .filter(
      (event) =>
        event.purpose === purpose &&
        event.eventKind === "carryover" &&
        event.occurredOn.endsWith("-01-01") &&
        isWithinRange({ date: event.occurredOn, from, to }),
    )
    .map((event) => ({
      kind: "permit_carryover" as const,
      id: `permit-carryover-${event.id}`,
      occurredOn: event.occurredOn,
      quantity: event.quantity,
    }));

  const entryRows: LedgerDisplayRow[] = entries.map((entry) => ({
    kind: "entry",
    entry,
  }));

  const merged = [...permitCarryovers, ...entryRows].sort((a, b) =>
    compareDate({
      a: a.kind === "entry" ? a.entry.occurredOn : a.occurredOn,
      b: b.kind === "entry" ? b.entry.occurredOn : b.occurredOn,
    }),
  );

  return merged;
}

export function resolveDisplayRowPermitBalance({
  row,
  permitBalances,
}: {
  row: LedgerDisplayRow;
  permitBalances?: Map<string, number>;
}): number | undefined {
  if (row.kind === "permit_carryover") {
    return row.quantity;
  }

  return permitBalances?.get(row.entry.id);
}

export function isDisplayRowSelectable({ row }: { row: LedgerDisplayRow }): boolean {
  return row.kind === "entry";
}

export function resolveDisplayRowId({ row }: { row: LedgerDisplayRow }): string {
  return row.kind === "entry" ? row.entry.id : row.id;
}

export function buildPermitCarryoverLabel(): string {
  return "譲受許可";
}

export function isYearOpeningDay({ date }: { date: string }): boolean {
  return date === buildYearOpeningDay({ year: Number(date.slice(0, 4)) });
}
