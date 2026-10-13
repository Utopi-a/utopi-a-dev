"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import type { InventoryOverview } from "@/features/ammo-ledger/inventory/build-inventory-overview/build-inventory-overview";
import {
  inventoryGaugeGroups,
  matchesGaugeGroup,
} from "@/features/ammo-ledger/inventory/inventory-gauge-groups/inventory-gauge-groups";
import { buildLedgerHref } from "@/features/ammo-ledger/ledger/build-ledger-href/build-ledger-href";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { cn } from "@/lib/cn";

type InventoryViewMode = "all" | "gauge-group" | "gauge" | "purpose";

type InventoryOverviewProps = {
  overview: InventoryOverview;
  /** 用途ごとの弾種IDごとの帳簿残数 */
  stockByPurpose: ReadonlyMap<LedgerPurpose, ReadonlyMap<string, number>>;
};

function formatStockCount({ count }: { count: number }): string {
  return formatStockQuantity({ quantity: count });
}

export function InventoryOverviewPanel({ overview, stockByPurpose }: InventoryOverviewProps) {
  const { navigate: navigateClientShell } = useAmmoLedgerClientNav();
  const [viewMode, setViewMode] = useState<InventoryViewMode>("all");
  const visibleGaugeGroups = overview.byGaugeGroup.filter((group) => group.bookStock !== 0);
  const [selectedGaugeGroupId, setGaugeGroupId] = useState(inventoryGaugeGroups[0]?.id ?? "");
  const gaugeGroupId = visibleGaugeGroups.some((group) => group.groupId === selectedGaugeGroupId)
    ? selectedGaugeGroupId
    : visibleGaugeGroups[0]?.groupId;
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
    // 弾種の既定用途で絞るだけだと全用途の合計になるため、その用途の帳簿の残数を出す。
    const purposeStock = stockByPurpose.get(purpose);
    return overview.byAmmoType
      .map((item) => ({ ...item, bookStock: purposeStock?.get(item.ammoTypeId) ?? 0 }))
      .filter((item) => item.bookStock !== 0 || item.defaultPurpose === purpose);
  }, [overview.byAmmoType, viewMode, gaugeGroupId, gaugeKey, purpose, stockByPurpose]);

  const filteredTotal = filteredAmmoTypes.reduce((sum, item) => sum + item.bookStock, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryChip label="全体" value={formatStockCount({ count: overview.totalStock })} />
        {visibleGaugeGroups.map((group) => (
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
        {visibleGaugeGroups.length > 0 ? (
          <FilterButton
            active={viewMode === "gauge-group"}
            onClick={() => setViewMode("gauge-group")}
          >
            号数グループ
          </FilterButton>
        ) : null}
        <FilterButton active={viewMode === "gauge"} onClick={() => setViewMode("gauge")}>
          号数
        </FilterButton>
        <FilterButton active={viewMode === "purpose"} onClick={() => setViewMode("purpose")}>
          用途
        </FilterButton>
      </div>

      {viewMode === "gauge-group" ? (
        <div className="flex flex-wrap gap-2">
          {visibleGaugeGroups.map((group) => (
            <FilterButton
              key={group.groupId}
              active={gaugeGroupId === group.groupId}
              onClick={() => setGaugeGroupId(group.groupId)}
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
            <caption className="sr-only">号数ごとの帳簿残数</caption>
            <thead>
              <tr className="border-b border-border/50 bg-muted/20 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  号数
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  帳簿残数
                </th>
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
        <table className="w-full text-sm">
          <caption className="sr-only">弾種ごとの帳簿残数</caption>
          <thead>
            <tr className="border-b border-border/50 bg-muted/20 text-left text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">
                弾種
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                号数
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                帳簿残数
              </th>
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
              filteredAmmoTypes.map((item) => {
                const ledgerHref = buildLedgerHref({
                  purpose:
                    viewMode === "purpose"
                      ? purpose
                      : resolveDefaultPurpose({ defaultPurpose: item.defaultPurpose }),
                });
                return (
                  <tr key={item.ammoTypeId} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={ledgerHref}
                        onClick={(event) => {
                          if (navigateClientShell({ href: ledgerHref })) event.preventDefault();
                        }}
                        className="underline-offset-4 hover:underline"
                      >
                        {item.ammoTypeName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {item.gaugeNumber ? `${item.gaugeNumber}号` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                      {formatStockCount({ count: item.bookStock })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
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
      aria-pressed={active}
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
