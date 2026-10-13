"use client";

import { useMemo } from "react";
import type { ammoType } from "@/db/schema/ammo-ledger";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { buildAmmoTypeFieldOptions } from "@/features/ammo-ledger/master/build-ammo-type-field-options/build-ammo-type-field-options";

/** 記録フォームの「弾」の選択。どのフォームでも同じ表記（1箱の発数・全用途の残数）にする。 */
export function AmmoTypeSelect({
  id,
  value,
  onChange,
  ammoTypes,
  stockByAmmoTypeId,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
}) {
  const options = useMemo(
    () => buildAmmoTypeFieldOptions({ ammoTypes, stockByAmmoTypeId }),
    [ammoTypes, stockByAmmoTypeId],
  );
  return (
    <FieldSelect id={id} label="弾" value={value} onChange={onChange} options={options} required />
  );
}
