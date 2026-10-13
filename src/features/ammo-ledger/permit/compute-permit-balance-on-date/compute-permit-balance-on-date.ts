import type { ammoPermitEvent } from "@/db/schema/ammo-ledger";
import {
  computeCurrentPermitState,
  filterByPurpose,
} from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import type { LedgerEntryRow } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

/**
 * 譲受日・用途で使える譲受許可の残数。その日までの譲受を差し引き、編集中の記録は除く。
 * 許可の失効は有効期限の翌日から適用する（帳簿の表と同じ）。
 */
export function computePermitBalanceOnDate({
  permitEvents,
  entries,
  purpose,
  occurredOn,
  excludedEntryId,
}: {
  permitEvents: Pick<
    typeof ammoPermitEvent.$inferSelect,
    "id" | "permitId" | "purpose" | "eventKind" | "occurredOn" | "quantity"
  >[];
  entries: Pick<
    LedgerEntryRow,
    "id" | "purpose" | "category" | "quantity" | "occurredOn" | "dayOrder" | "createdAt"
  >[];
  purpose: LedgerPurpose;
  occurredOn: string;
  excludedEntryId?: string;
}): number {
  return computeCurrentPermitState({
    permitEvents: filterByPurpose({ rows: permitEvents, purpose }).map((event) => ({
      id: event.id,
      permitId: event.permitId,
      occurredOn: event.occurredOn,
      eventKind: event.eventKind as PermitEventKind,
      quantity: event.quantity,
    })),
    ledgerEntries: filterByPurpose({ rows: entries, purpose })
      .filter((entry) => entry.id !== excludedEntryId)
      .map((entry) => ({
        id: entry.id,
        occurredOn: entry.occurredOn,
        dayOrder: entry.dayOrder,
        createdAt: entry.createdAt,
        category: entry.category as LedgerCategory,
        quantity: entry.quantity,
      })),
    today: occurredOn,
  }).balance;
}
