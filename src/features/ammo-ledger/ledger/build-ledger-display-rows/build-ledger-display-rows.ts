import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import { isPermitEventOnOrBeforeToday } from "@/features/ammo-ledger/permit/is-permit-event-on-or-before-today/is-permit-event-on-or-before-today";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type LedgerDisplayRow =
  | {
      kind: "permit_carryover";
      id: string;
      occurredOn: string;
      quantity: number;
      expiresOn: string | null;
      permitName: string;
      permitPurpose: string;
    }
  | {
      kind: "permit_expiry";
      id: string;
      occurredOn: string;
      permitName: string;
      permitPurpose: string;
    }
  | {
      kind: "entry";
      entry: typeof ammoLedgerEntry.$inferSelect;
    };

function resolveDisplayRowIdLocal({ row }: { row: LedgerDisplayRow }): string {
  return row.kind === "entry" ? row.entry.id : row.id;
}

function compareDisplayRows({ a, b }: { a: LedgerDisplayRow; b: LedgerDisplayRow }): number {
  const aDate = a.kind === "entry" ? a.entry.occurredOn : a.occurredOn;
  const bDate = b.kind === "entry" ? b.entry.occurredOn : b.occurredOn;
  const dateCompare = aDate.localeCompare(bDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  if (a.kind === "permit_carryover" && b.kind !== "permit_carryover") {
    return -1;
  }
  if (a.kind !== "permit_carryover" && b.kind === "permit_carryover") {
    return 1;
  }

  const aIsExpiry = a.kind === "permit_expiry";
  const bIsExpiry = b.kind === "permit_expiry";
  if (a.kind === "entry" && bIsExpiry) {
    return -1;
  }
  if (aIsExpiry && b.kind === "entry") {
    return 1;
  }

  if (a.kind === "entry" && b.kind === "entry") {
    return compareLedgerEntries({ a: a.entry, b: b.entry });
  }

  return resolveDisplayRowIdLocal({ row: a }).localeCompare(resolveDisplayRowIdLocal({ row: b }));
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

function resolvePermitById({
  permitId,
  permits,
}: {
  permitId: string | null;
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
}): typeof ammoAcquisitionPermit.$inferSelect | null {
  if (!permitId) {
    return null;
  }

  return permits.find((permit) => permit.id === permitId) ?? null;
}

export function buildLedgerDisplayRows({
  entries,
  permitEvents,
  permits,
  purpose,
  today,
  from,
  to,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  purpose: LedgerPurpose;
  today: string;
  from?: string;
  to?: string;
}): LedgerDisplayRow[] {
  const permitCarryovers = permitEvents
    .filter(
      (event) =>
        event.purpose === purpose &&
        event.eventKind === "carryover" &&
        event.occurredOn.endsWith("-01-01") &&
        isPermitEventOnOrBeforeToday({ occurredOn: event.occurredOn, today }) &&
        isWithinRange({ date: event.occurredOn, from, to }),
    )
    .map((event) => {
      const permit = resolvePermitById({ permitId: event.permitId, permits });

      return {
        kind: "permit_carryover" as const,
        id: `permit-carryover-${event.id}`,
        occurredOn: event.occurredOn,
        quantity: event.quantity,
        expiresOn: permit?.expiresOn ?? null,
        permitName: permit?.name ?? "その他",
        permitPurpose: permit?.permitPurpose ?? "",
      };
    });

  const permitExpiries = permitEvents
    .filter(
      (event) =>
        event.purpose === purpose &&
        event.eventKind === "expiry" &&
        event.permitId !== null &&
        isPermitEventOnOrBeforeToday({ occurredOn: event.occurredOn, today }) &&
        isWithinRange({ date: event.occurredOn, from, to }),
    )
    .map((event) => {
      const permit = resolvePermitById({ permitId: event.permitId, permits });

      return {
        kind: "permit_expiry" as const,
        id: `permit-expiry-${event.id}`,
        occurredOn: event.occurredOn,
        permitName: permit?.name ?? "その他",
        permitPurpose: permit?.permitPurpose ?? "",
      };
    });

  const entryRows: LedgerDisplayRow[] = entries.map((entry) => ({
    kind: "entry",
    entry,
  }));

  return [...permitCarryovers, ...permitExpiries, ...entryRows].sort((a, b) =>
    compareDisplayRows({ a, b }),
  );
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

  if (row.kind === "permit_expiry") {
    return 0;
  }

  return permitBalances?.get(row.entry.id);
}

export function isDisplayRowSelectable({ row }: { row: LedgerDisplayRow }): boolean {
  return row.kind === "entry" || row.kind === "permit_carryover";
}

export function resolveDisplayRowId({ row }: { row: LedgerDisplayRow }): string {
  return row.kind === "entry" ? row.entry.id : row.id;
}

export function buildPermitCarryoverLabel({ permitName }: { permitName: string }): string {
  return permitName;
}
