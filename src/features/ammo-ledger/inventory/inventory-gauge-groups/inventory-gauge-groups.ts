export type InventoryGaugeGroup = {
  id: string;
  label: string;
  gauges: readonly string[];
};

/** スキート等でまとめて見たい号数グループ */
export const inventoryGaugeGroups: InventoryGaugeGroup[] = [
  { id: "7.5", label: "7.5号", gauges: ["7.5"] },
  { id: "9-9.5", label: "9号・9.5号", gauges: ["9", "9.5"] },
];

export function matchesGaugeGroup({
  gaugeNumber,
  group,
}: {
  gaugeNumber: string | null | undefined;
  group: InventoryGaugeGroup;
}): boolean {
  if (!gaugeNumber?.trim()) {
    return false;
  }
  return group.gauges.includes(gaugeNumber.trim());
}
