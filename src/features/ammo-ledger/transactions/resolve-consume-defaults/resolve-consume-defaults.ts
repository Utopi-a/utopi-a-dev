import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import type { LedgerEntryRow } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

export type ConsumeDefaults = {
  gunId?: string;
  ammoTypeId?: string;
  purpose?: LedgerPurpose;
  /** 前回の消費場所。射撃場の選び直しと、狩猟場所の初期値に使う */
  location?: string;
  /** 前回の消費記録を初期値に使ったか（画面で知らせる） */
  fromPreviousEntry: boolean;
};

/**
 * 新しい消費記録の初期値を決める。直前の消費と同じ銃・弾・用途を使い、
 * 前回がない・削除済みの場合は、登録が1件だけの銃・弾を選ぶ。
 */
export function resolveConsumeDefaults({
  entries,
  gunIds,
  ammoTypeIds,
}: {
  entries: Pick<
    LedgerEntryRow,
    | "category"
    | "gunId"
    | "ammoTypeId"
    | "purpose"
    | "location"
    | "occurredOn"
    | "dayOrder"
    | "createdAt"
  >[];
  gunIds: string[];
  ammoTypeIds: string[];
}): ConsumeDefaults {
  const previous = entries
    .filter((entry) => entry.category === "consume")
    .sort((a, b) => compareLedgerEntries({ a: b, b: a }))[0];

  const previousGunId =
    previous?.gunId && gunIds.includes(previous.gunId) ? previous.gunId : undefined;
  const previousAmmoTypeId =
    previous?.ammoTypeId && ammoTypeIds.includes(previous.ammoTypeId)
      ? previous.ammoTypeId
      : undefined;

  return {
    gunId: previousGunId ?? (gunIds.length === 1 ? gunIds[0] : undefined),
    ammoTypeId: previousAmmoTypeId ?? (ammoTypeIds.length === 1 ? ammoTypeIds[0] : undefined),
    purpose: previous ? (parseLedgerPurpose({ value: previous.purpose }) ?? undefined) : undefined,
    location: previous?.location ?? undefined,
    fromPreviousEntry: Boolean(previousGunId || previousAmmoTypeId),
  };
}
