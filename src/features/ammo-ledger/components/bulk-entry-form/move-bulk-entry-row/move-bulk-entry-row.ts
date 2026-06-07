import type { BulkEntryRowState } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-row-state";

export function moveBulkEntryRow({
  rows,
  fromIndex,
  toIndex,
}: {
  rows: BulkEntryRowState[];
  fromIndex: number;
  toIndex: number;
}): BulkEntryRowState[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length ||
    fromIndex === toIndex
  ) {
    return rows;
  }

  const nextRows = [...rows];
  const [movedRow] = nextRows.splice(fromIndex, 1);
  nextRows.splice(toIndex, 0, movedRow);
  return nextRows;
}
