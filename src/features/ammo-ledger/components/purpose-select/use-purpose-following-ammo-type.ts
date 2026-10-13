"use client";

import { useRef, useState } from "react";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";

type AmmoTypePurposeSource = { id: string; defaultPurpose: string | null };

/**
 * 弾を選び直したときの用途。用途をまだ決めていなければ、その弾の既定用途にそろえる。
 * 利用者が選んだ用途を弾の選択で上書きすると、別の用途の帳簿へ記録してしまうため。
 */
export function resolvePurposeForAmmoType({
  purpose,
  isPurposeChosen,
  ammoType,
}: {
  purpose: LedgerPurpose;
  isPurposeChosen: boolean;
  ammoType?: AmmoTypePurposeSource;
}): LedgerPurpose {
  if (isPurposeChosen || !ammoType) {
    return purpose;
  }
  return resolveDefaultPurpose({ defaultPurpose: ammoType.defaultPurpose });
}

/**
 * 弾と用途の選択を持つ。弾を選ぶと用途が既定用途に追随するが、
 * 利用者が用途を選んだ後と、既存の記録の編集・入力の復元（keepsPurpose）では追随しない。
 */
export function usePurposeFollowingAmmoType({
  ammoTypes,
  initialAmmoTypeId,
  initialPurpose,
  keepsPurpose,
}: {
  ammoTypes: AmmoTypePurposeSource[];
  initialAmmoTypeId?: string;
  initialPurpose?: LedgerPurpose;
  keepsPurpose: boolean;
}) {
  const [ammoTypeId, setAmmoTypeId] = useState(initialAmmoTypeId ?? "");
  const [purpose, setPurpose] = useState<LedgerPurpose>(initialPurpose ?? "shooting");
  const isPurposeChosen = useRef(keepsPurpose);

  /** 弾を選び、選んだ後の用途を返す */
  function selectAmmoType(nextAmmoTypeId: string): LedgerPurpose {
    const nextPurpose = resolvePurposeForAmmoType({
      purpose,
      isPurposeChosen: isPurposeChosen.current,
      ammoType: ammoTypes.find((type) => type.id === nextAmmoTypeId),
    });
    setAmmoTypeId(nextAmmoTypeId);
    setPurpose(nextPurpose);
    return nextPurpose;
  }

  function choosePurpose(nextPurpose: LedgerPurpose) {
    isPurposeChosen.current = true;
    setPurpose(nextPurpose);
  }

  return { ammoTypeId, purpose, selectAmmoType, choosePurpose };
}
