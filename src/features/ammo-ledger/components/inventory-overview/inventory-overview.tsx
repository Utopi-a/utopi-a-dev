"use client";

import { type ReactNode, useMemo, useState } from "react";
import type { InventoryOverview } from "@/features/ammo-ledger/inventory/build-inventory-overview/build-inventory-overview";
import {
  inventoryGaugeGroups,
  matchesGaugeGroup,
} from "@/features/ammo-ledger/inventory/inventory-gauge-groups/inventory-gauge-groups";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type InventoryViewMode = "all" | "gauge-group" | "gauge" | "purpose";

type InventoryOverviewProps = {
  overview: InventoryOverview;
};

function formatStockCount({ count }: { count: number }): string {
  return formatStockQuantity({ quantity: count });
}

export function InventoryOverviewPanel({ overview }: InventoryOverviewProps) {
  const [viewMode, setViewMode] = useState<InventoryViewMode>("all");
  const [gaugeGroupId, setGaugeGroupId] = useState(inventoryGaugeGroups[0]?.id ?? "");
  const [gaugeKey, setGaugeKey] = useState(overview.byGauge[0]?.gaugeKey ?? "");
  const [purpose, setPurpose] = useState<LedgerPurpose>("shooting");

  const filteredAmmoTypes = useMemo(() => {
    if (viewMode === "all") {
      return overview.byAmmoType;
    }
    if (viewMode === "gauge-group") {
      const group = inventoryGaugeGroups.find((g) => g.id === gaugeGroupId);
      if (!group) return overview.byAmmoType;
      return overview.byAmmoType.filter((item) =>
        matchesGaugeGroup({ gaugeNumber: item.gaugeNumber, group }),
      );
    }
    if (viewMode === "gauge") {
      return overview.byAmmoType.filter((item) => {
        const key = item.gaugeNumber?.trim() || "__unset__";
        return key === gaugeKey;
      });
    }
    return overview.byAmmoType.filter((item) => item.defaultPurpose === purpose);
  }, [overview.byAmmoType, viewMode, gaugeGroupId, gaugeKey, purpose]);

  const filteredTotal = filteredAmmoTypes.reduce((sum, item) => sum + item.bookStock, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryChip label="全体" value={formatStockCount({ count: overview.totalStock })} active />
        {overview.byGaugeGroup.map((group) => (
          <SummaryChip
            key={group.groupId}
            label={group.label}
            value={formatStockCount({ count: group.bookStock })}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterButton active={viewMode === "all"} onClick={() => setViewMode("all")}>
          すべて
        </FilterButton>
        <FilterButton
          active={viewMode === "gauge-group"}
          onClick={() => setViewMode("gauge-group")}
        >
          号数グループ
        </FilterButton>
        <FilterButton active={viewMode === "gauge"} onClick={() => setViewMode("gauge")}>
          号数
        </FilterButton>
        <FilterButton active={viewMode === "purpose"} onClick={() => setViewMode("purpose")}>
          用途
        </FilterButton>
      </div>

      {viewMode === "gauge-group" ? (
        <div className="flex flex-wrap gap-2">
          {inventoryGaugeGroups.map((group) => (
            <FilterButton
              key={group.id}
              active={gaugeGroupId === group.id}
              onClick={() => setGaugeGroupId(group.id)}
            >
              {group.label}
            </FilterButton>
          ))}
        </div>
      ) : null}

      {viewMode === "gauge" ? (
        <div className="flex flex-wrap gap-2">
          {overview.byGauge.map((gauge) => (
            <FilterButton
              key={gauge.gaugeKey}
              active={gaugeKey === gauge.gaugeKey}
              onClick={() => setGaugeKey(gauge.gaugeKey)}
            >
              {gauge.label}
            </FilterButton>
          ))}
        </div>
      ) : null}

      {viewMode === "purpose" ? (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ledgerPurposeLabels) as LedgerPurpose[]).map((p) => (
            <FilterButton key={p} active={purpose === p} onClick={() => setPurpose(p)}>
              {ledgerPurposeLabels[p]}
            </FilterButton>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        表示中の合計:{" "}
        <span className="font-medium text-foreground">
          {formatStockCount({ count: filteredTotal })}
        </span>
      </p>

      {overview.byGauge.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full min-w-[280px] text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">号数</th>
                <th className="px-3 py-2 text-right font-medium">帳簿残数</th>
              </tr>
            </thead>
            <tbody>
              {overview.byGauge.map((row) => (
                <tr key={row.gaugeKey} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatStockCount({ count: row.bookStock })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">弾種</th>
              <th className="px-3 py-2 font-medium">号数</th>
              <th className="px-3 py-2 text-right font-medium">帳簿残数</th>
            </tr>
          </thead>
          <tbody>
            {filteredAmmoTypes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  該当する弾種がありません
                </td>
              </tr>
            ) : (
              filteredAmmoTypes.map((item) => (
                <tr key={item.ammoTypeId} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2">{item.ammoTypeName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.gaugeNumber ? `${item.gaugeNumber}号` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatStockCount({ count: item.bookStock })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        active ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/15",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-foreground/20 bg-foreground/5 text-foreground"
          : "border-transparent bg-muted/30 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
