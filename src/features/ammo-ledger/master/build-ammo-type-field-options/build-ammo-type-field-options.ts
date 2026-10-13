import type { ammoType } from "@/db/schema/ammo-ledger";

export function buildAmmoTypeFieldOptions({
  ammoTypes,
  stockByAmmoTypeId,
}: {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
}) {
  return ammoTypes.map((type) => ({
    value: type.id,
    label: `${type.name}（1箱${type.roundsPerBox}発 · 全用途の残${stockByAmmoTypeId[type.id] ?? 0}個）`,
  }));
}
