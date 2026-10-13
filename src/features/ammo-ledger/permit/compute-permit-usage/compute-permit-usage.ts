import {
  compareLedgerEntries,
  type LedgerEntrySortKey,
} from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import { isPermitActive } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

type PermitRow = {
  id: string;
  grantedOn: string;
  expiresOn: string;
  quantity: number;
};

type LedgerRow = {
  category: LedgerCategory;
  quantity: number;
} & LedgerEntrySortKey;

/**
 * 許可ごとの使用数の見積もり。譲受記録は許可IDを持たないため、譲受日に有効な許可のうち
 * 有効期限の早いものから順に割り当てる。今日より後の日付の譲受はまだ使っていないものとして数えない。
 */
export function computePermitUsage({
  permits,
  ledgerEntries,
  today,
}: {
  permits: PermitRow[];
  ledgerEntries: LedgerRow[];
  today: string;
}): Map<string, number> {
  const usedByPermitId = new Map<string, number>();
  const permitsByExpiry = [...permits].sort(
    (a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.grantedOn.localeCompare(b.grantedOn),
  );
  const acquisitions = ledgerEntries
    .filter((entry) => entry.category === "acquire" && entry.occurredOn <= today)
    .sort((a, b) => compareLedgerEntries({ a, b }));

  for (const acquisition of acquisitions) {
    let unallocated = acquisition.quantity;

    for (const permit of permitsByExpiry) {
      if (unallocated <= 0) {
        break;
      }
      if (
        !isPermitActive({
          grantedOn: permit.grantedOn,
          expiresOn: permit.expiresOn,
          today: acquisition.occurredOn,
        })
      ) {
        continue;
      }

      const used = usedByPermitId.get(permit.id) ?? 0;
      const allocated = Math.min(permit.quantity - used, unallocated);
      if (allocated > 0) {
        usedByPermitId.set(permit.id, used + allocated);
        unallocated -= allocated;
      }
    }
  }

  return usedByPermitId;
}
