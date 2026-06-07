import {
  inventoryGaugeGroups,
  matchesGaugeGroup,
} from "@/features/ammo-ledger/inventory/inventory-gauge-groups/inventory-gauge-groups";

export type InventoryOverviewItem = {
  ammoTypeId: string;
  ammoTypeName: string;
  gaugeNumber: string | null;
  defaultPurpose: string | null;
  roundsPerBox: number;
  bookStock: number;
};

export type InventoryGaugeSummary = {
  gaugeKey: string;
  label: string;
  bookStock: number;
};

export type InventoryGaugeGroupSummary = {
  groupId: string;
  label: string;
  bookStock: number;
};

export type InventoryOverview = {
  totalStock: number;
  byAmmoType: InventoryOverviewItem[];
  byGauge: InventoryGaugeSummary[];
  byGaugeGroup: InventoryGaugeGroupSummary[];
};

function formatGaugeLabel({ gaugeNumber }: { gaugeNumber: string | null }): string {
  if (!gaugeNumber?.trim()) {
    return "号数未設定";
  }
  return `${gaugeNumber.trim()}号`;
}

export function buildInventoryOverview({
  items,
}: {
  items: InventoryOverviewItem[];
}): InventoryOverview {
  const totalStock = items.reduce((sum, item) => sum + item.bookStock, 0);

  const gaugeMap = new Map<string, number>();
  for (const item of items) {
    const key = item.gaugeNumber?.trim() || "__unset__";
    gaugeMap.set(key, (gaugeMap.get(key) ?? 0) + item.bookStock);
  }

  const byGauge = [...gaugeMap.entries()]
    .map(([gaugeKey, bookStock]) => ({
      gaugeKey,
      label: formatGaugeLabel({
        gaugeNumber: gaugeKey === "__unset__" ? null : gaugeKey,
      }),
      bookStock,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));

  const byGaugeGroup = inventoryGaugeGroups.map((group) => ({
    groupId: group.id,
    label: group.label,
    bookStock: items
      .filter((item) => matchesGaugeGroup({ gaugeNumber: item.gaugeNumber, group }))
      .reduce((sum, item) => sum + item.bookStock, 0),
  }));

  return {
    totalStock,
    byAmmoType: items,
    byGauge,
    byGaugeGroup,
  };
}
