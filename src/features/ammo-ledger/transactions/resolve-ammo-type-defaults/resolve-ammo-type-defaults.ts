import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  parseLedgerPurpose,
  resolveDefaultPurpose,
} from "@/features/ammo-ledger/schema/resolve-default-purpose";
import type { LedgerEntryRow } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

export type AmmoTypeDefaultsEntry = Pick<
  LedgerEntryRow,
  | "category"
  | "gunId"
  | "ammoTypeId"
  | "purpose"
  | "location"
  | "occurredOn"
  | "dayOrder"
  | "createdAt"
>;

/**
 * 新しい記録の弾と用途の初期値。同じ区分の直前の記録と同じ弾・用途を使い、
 * 前回がない・弾が削除済みの場合は、登録が1件だけの弾を選ぶ（用途はその弾の既定用途）。
 */
export function resolveAmmoTypeDefaults({
  entries,
  category,
  ammoTypes,
}: {
  entries: AmmoTypeDefaultsEntry[];
  category: LedgerCategory;
  ammoTypes: { id: string; defaultPurpose: string | null }[];
}): {
  previous?: AmmoTypeDefaultsEntry;
  ammoTypeId?: string;
  purpose?: LedgerPurpose;
  isAmmoTypeFromPrevious: boolean;
} {
  const previous = entries
    .filter((entry) => entry.category === category)
    .sort((a, b) => compareLedgerEntries({ a: b, b: a }))[0];
  const previousAmmoTypeId =
    previous?.ammoTypeId && ammoTypes.some((type) => type.id === previous.ammoTypeId)
      ? previous.ammoTypeId
      : undefined;
  const onlyAmmoType = ammoTypes.length === 1 ? ammoTypes[0] : undefined;
  const previousPurpose = previous
    ? (parseLedgerPurpose({ value: previous.purpose }) ?? undefined)
    : undefined;

  return {
    previous,
    ammoTypeId: previousAmmoTypeId ?? onlyAmmoType?.id,
    // 弾を自動で選んだときは、手で選んだときと同じくその弾の既定用途にそろえる。
    purpose:
      !previousAmmoTypeId && onlyAmmoType
        ? resolveDefaultPurpose({ defaultPurpose: onlyAmmoType.defaultPurpose })
        : previousPurpose,
    isAmmoTypeFromPrevious: Boolean(previousAmmoTypeId),
  };
}
