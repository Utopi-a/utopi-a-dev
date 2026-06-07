import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type LedgerPrintDisplayRow =
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
      permitName: string;
    };

function resolveDisplayRowIdLocal({ row }: { row: LedgerPrintDisplayRow }): string {
  return row.kind === "entry" ? row.entry.id : row.id;
}

function compareDisplayRows({
  a,
  b,
}: {
  a: LedgerPrintDisplayRow;
  b: LedgerPrintDisplayRow;
}): number {
  const aDate = a.kind === "entry" ? a.entry.occurredOn : a.occurredOn;
  const bDate = b.kind === "entry" ? b.entry.occurredOn : b.occurredOn;
  const dateCompare = aDate.localeCompare(bDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  const aIsOpening = a.kind === "permit_carryover";
  const bIsOpening = b.kind === "permit_carryover";
  if (aIsOpening && !bIsOpening) {
    return -1;
  }
  if (!aIsOpening && bIsOpening) {
    return 1;
  }

  const aIsExpiry = a.kind === "permit_expiry";
  const bIsExpiry = b.kind === "permit_expiry";
  if (!aIsOpening && !bIsOpening) {
    if (aIsExpiry && !bIsExpiry && b.kind === "entry") {
      return 1;
    }
    if (!aIsExpiry && bIsExpiry && a.kind === "entry") {
      return -1;
    }
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

export function buildLedgerPrintDisplayRows({
  entries,
  permitEvents,
  permits,
  permitName,
  permitPurpose,
  ledgerPurpose,
  from,
  to,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  permitName: string;
  permitPurpose: string;
  ledgerPurpose: LedgerPurpose;
  from?: string;
  to?: string;
}): LedgerPrintDisplayRow[] {
  const sectionPermitIds = new Set(
    permits
      .filter(
        (permit) =>
          permit.name === permitName &&
          permit.permitPurpose === permitPurpose &&
          permit.ledgerPurpose === ledgerPurpose,
      )
      .map((permit) => permit.id),
  );

  const permitCarryovers = permitEvents
    .filter(
      (event) =>
        event.purpose === ledgerPurpose &&
        event.eventKind === "carryover" &&
        event.occurredOn.endsWith("-01-01") &&
        event.permitId !== null &&
        sectionPermitIds.has(event.permitId) &&
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
        permitName: permit?.name ?? permitName,
        permitPurpose: permit?.permitPurpose ?? permitPurpose,
      };
    });

  const permitExpiries = permitEvents
    .filter(
      (event) =>
        event.purpose === ledgerPurpose &&
        event.eventKind === "expiry" &&
        event.permitId !== null &&
        sectionPermitIds.has(event.permitId) &&
        isWithinRange({ date: event.occurredOn, from, to }),
    )
    .map((event) => {
      const permit = resolvePermitById({ permitId: event.permitId, permits });

      return {
        kind: "permit_expiry" as const,
        id: `permit-expiry-${event.id}`,
        occurredOn: event.occurredOn,
        permitName: permit?.name ?? permitName,
        permitPurpose: permit?.permitPurpose ?? permitPurpose,
      };
    });

  const entryRows: LedgerPrintDisplayRow[] = entries.map((entry) => ({
    kind: "entry",
    entry,
    permitName,
  }));

  return [...permitCarryovers, ...permitExpiries, ...entryRows].sort((a, b) =>
    compareDisplayRows({ a, b }),
  );
}

export function resolvePrintDisplayRowPermitBalance({
  row,
  permitBalances,
}: {
  row: LedgerPrintDisplayRow;
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
