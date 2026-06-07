export type LedgerEntrySortKey = {
  occurredOn: string;
  dayOrder?: number;
  createdAt?: Date | string;
};

function toCreatedAtIso({ createdAt }: { createdAt?: Date | string }): string {
  if (!createdAt) {
    return "";
  }
  return typeof createdAt === "string" ? createdAt : createdAt.toISOString();
}

export function compareLedgerEntries({
  a,
  b,
}: {
  a: LedgerEntrySortKey;
  b: LedgerEntrySortKey;
}): number {
  const dateCompare = a.occurredOn.localeCompare(b.occurredOn);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  const orderCompare = (a.dayOrder ?? 0) - (b.dayOrder ?? 0);
  if (orderCompare !== 0) {
    return orderCompare;
  }

  return toCreatedAtIso({ createdAt: a.createdAt }).localeCompare(
    toCreatedAtIso({ createdAt: b.createdAt }),
  );
}
