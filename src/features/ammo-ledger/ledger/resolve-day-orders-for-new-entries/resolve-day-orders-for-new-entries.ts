import { and, eq, inArray, isNull, max } from "drizzle-orm";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";

type LedgerEntryDb = Pick<typeof ammoLedgerEntry.$inferSelect, "occurredOn" | "dayOrder">;

export async function fetchMaxDayOrderByDate({
  tx,
  userId,
  occurredOnDates,
}: {
  tx: {
    select: typeof import("@/db").db.select;
  };
  userId: string;
  occurredOnDates: string[];
}): Promise<Map<string, number>> {
  const uniqueDates = [...new Set(occurredOnDates)];
  if (uniqueDates.length === 0) {
    return new Map();
  }

  const rows = await tx
    .select({
      occurredOn: ammoLedgerEntry.occurredOn,
      maxDayOrder: max(ammoLedgerEntry.dayOrder),
    })
    .from(ammoLedgerEntry)
    .where(
      and(
        eq(ammoLedgerEntry.userId, userId),
        isNull(ammoLedgerEntry.voidedAt),
        inArray(ammoLedgerEntry.occurredOn, uniqueDates),
      ),
    )
    .groupBy(ammoLedgerEntry.occurredOn);

  return new Map(rows.map((row) => [row.occurredOn, row.maxDayOrder ?? -1]));
}

export function assignDayOrdersForNewEntries({
  occurredOnDates,
  maxDayOrderByDate,
}: {
  occurredOnDates: string[];
  maxDayOrderByDate: Map<string, number>;
}): number[] {
  const nextOrderByDate = new Map<string, number>();

  return occurredOnDates.map((occurredOn) => {
    const current = nextOrderByDate.get(occurredOn);
    const nextOrder = current ?? (maxDayOrderByDate.get(occurredOn) ?? -1) + 1;
    nextOrderByDate.set(occurredOn, nextOrder + 1);
    return nextOrder;
  });
}

export async function resolveNextDayOrder({
  tx,
  userId,
  occurredOn,
}: {
  tx: {
    select: typeof import("@/db").db.select;
  };
  userId: string;
  occurredOn: string;
}): Promise<number> {
  const maxDayOrderByDate = await fetchMaxDayOrderByDate({
    tx,
    userId,
    occurredOnDates: [occurredOn],
  });

  return assignDayOrdersForNewEntries({
    occurredOnDates: [occurredOn],
    maxDayOrderByDate,
  })[0];
}

export function sortLedgerEntries<T extends LedgerEntryDb & { createdAt: Date | string }>({
  entries,
}: {
  entries: T[];
}): T[] {
  return [...entries].sort((a, b) => compareLedgerEntries({ a, b }));
}
