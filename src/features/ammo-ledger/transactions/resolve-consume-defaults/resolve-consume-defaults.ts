import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  type AmmoTypeDefaultsEntry,
  resolveAmmoTypeDefaults,
} from "@/features/ammo-ledger/transactions/resolve-ammo-type-defaults/resolve-ammo-type-defaults";

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
 * 前回がない・削除済みの場合は、登録が1件だけの銃・弾を選ぶ（用途はその弾の既定用途）。
 */
export function resolveConsumeDefaults({
  entries,
  gunIds,
  ammoTypes,
}: {
  entries: AmmoTypeDefaultsEntry[];
  gunIds: string[];
  ammoTypes: { id: string; defaultPurpose: string | null }[];
}): ConsumeDefaults {
  const { previous, ammoTypeId, purpose, isAmmoTypeFromPrevious } = resolveAmmoTypeDefaults({
    entries,
    category: "consume",
    ammoTypes,
  });
  const previousGunId =
    previous?.gunId && gunIds.includes(previous.gunId) ? previous.gunId : undefined;

  return {
    gunId: previousGunId ?? (gunIds.length === 1 ? gunIds[0] : undefined),
    ammoTypeId,
    purpose,
    location: previous?.location ?? undefined,
    fromPreviousEntry: Boolean(previousGunId || isAmmoTypeFromPrevious),
  };
}
