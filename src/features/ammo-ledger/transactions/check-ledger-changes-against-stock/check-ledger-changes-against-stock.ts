import { validateStockTimeline } from "@/features/ammo-ledger/ledger/validate-stock-timeline/validate-stock-timeline";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type {
  LedgerEntryChanges,
  LedgerEntryRow,
} from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

/**
 * 変更後の帳簿で、どの時点でも在庫が不足しないかを確かめる。
 * サーバーの保存前検証と同じ判定を、画面のデータで先に行う。
 */
export function checkLedgerChangesAgainstStock({
  entries,
  changes,
}: {
  entries: LedgerEntryRow[];
  changes: LedgerEntryChanges;
}): { ok: true } | { ok: false; error: string } {
  const replacedIds = new Set([
    ...changes.removedIds,
    ...changes.upserted.map((entry) => entry.id),
  ]);

  return validateStockTimeline({
    entries: [
      ...entries.filter((entry) => !replacedIds.has(entry.id)),
      ...changes.upserted,
    ].flatMap((entry) =>
      entry.ammoTypeId
        ? [
            {
              id: entry.id,
              ammoTypeId: entry.ammoTypeId,
              ammoTypeName: entry.ammoTypeName,
              purpose: entry.purpose,
              category: entry.category as LedgerCategory,
              quantity: entry.quantity,
              occurredOn: entry.occurredOn,
              dayOrder: entry.dayOrder,
              createdAt: entry.createdAt,
            },
          ]
        : [],
    ),
  });
}
