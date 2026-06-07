import type { ammoType } from "@/db/schema/ammo-ledger";

export function buildAmmoTypeFieldOptions({
  ammoTypes,
  stockByAmmoTypeId,
  roundsPerBoxLabel = "1箱",
}: {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
  roundsPerBoxLabel?: string;
}) {
  return ammoTypes.map((type) => ({
    value: type.id,
    label: `${type.name}（${roundsPerBoxLabel}${type.roundsPerBox}発 · 残${stockByAmmoTypeId[type.id] ?? 0}発）`,
  }));
}
