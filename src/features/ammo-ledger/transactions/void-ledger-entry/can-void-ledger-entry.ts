export function canVoidLedgerEntry({
  entryUserId,
  requestUserId,
  voidedAt,
}: {
  entryUserId: string;
  requestUserId: string;
  voidedAt: Date | null;
}): boolean {
  if (entryUserId !== requestUserId) {
    return false;
  }
  if (voidedAt !== null) {
    return false;
  }
  return true;
}
