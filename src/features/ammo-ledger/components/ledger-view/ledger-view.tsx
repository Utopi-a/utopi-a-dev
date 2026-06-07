"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActivePermitStatus } from "@/features/ammo-ledger/components/active-permit-status/active-permit-status";
import { AmmoLedgerRefreshIndicator } from "@/features/ammo-ledger/components/ammo-ledger-refresh-indicator/ammo-ledger-refresh-indicator";
import { HomeStorageWarning } from "@/features/ammo-ledger/components/home-storage-warning/home-storage-warning";
import { LedgerTableShell } from "@/features/ammo-ledger/components/ledger-table/ledger-table-shell";
import { PurposeFilter } from "@/features/ammo-ledger/components/purpose-filter/purpose-filter";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import {
  computeCurrentPermitBalance,
  computeRunningPermitBalance,
  filterByPurpose,
} from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import {
  type LedgerPurpose,
  ledgerPurposeTabLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

function readPurposeFromUrl(): LedgerPurpose {
  if (typeof window === "undefined") {
    return "shooting";
  }
  const purpose = new URLSearchParams(window.location.search).get("purpose");
  return parseLedgerPurpose({ value: purpose }) ?? "shooting";
}

function syncPurposeToUrl({ purpose }: { purpose: LedgerPurpose }) {
  const url = new URL(window.location.href);
  url.searchParams.set("purpose", purpose);
  window.history.replaceState(window.history.state, "", url);
}

type LedgerViewContentProps = {
  workspace: AmmoLedgerWorkspace;
  ownerName: string;
  isRefreshing: boolean;
};

function LedgerViewContent({ workspace, ownerName, isRefreshing }: LedgerViewContentProps) {
  const [purpose, setPurpose] = useState(readPurposeFromUrl);
  const today = new Date().toISOString().slice(0, 10);
  const { entries, permitEvents, permits } = workspace;

  useEffect(() => {
    function handlePopState() {
      setPurpose(readPurposeFromUrl());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const purposeEntries = useMemo(
    () => filterByPurpose({ rows: entries, purpose }),
    [entries, purpose],
  );

  const purposePermitEvents = useMemo(
    () => filterByPurpose({ rows: permitEvents, purpose }),
    [permitEvents, purpose],
  );

  const permitEventRows = useMemo(
    () =>
      purposePermitEvents.map((event) => ({
        occurredOn: event.occurredOn,
        eventKind: event.eventKind as PermitEventKind,
        quantity: event.quantity,
      })),
    [purposePermitEvents],
  );

  const ledgerEntryRows = useMemo(
    () =>
      purposeEntries.map((entry) => ({
        id: entry.id,
        occurredOn: entry.occurredOn,
        category: entry.category as LedgerCategory,
        quantity: entry.quantity,
      })),
    [purposeEntries],
  );

  const permitBalance = useMemo(
    () =>
      computeCurrentPermitBalance({
        permitEvents: permitEventRows,
        ledgerEntries: ledgerEntryRows,
      }),
    [permitEventRows, ledgerEntryRows],
  );

  const permitBalances = useMemo(
    () =>
      computeRunningPermitBalance({
        permitEvents: permitEventRows,
        ledgerEntries: ledgerEntryRows,
      }),
    [permitEventRows, ledgerEntryRows],
  );

  const homeStorage = useMemo(
    () =>
      evaluateHomeStorageLimit({
        entries: entries.map((entry) => ({
          id: entry.id,
          occurredOn: entry.occurredOn,
          category: entry.category as LedgerCategory,
          quantity: entry.quantity,
        })),
      }),
    [entries],
  );

  const year = new Date().getFullYear();
  const printFrom = entries[0]?.occurredOn ?? `${year}-01-01`;
  const printTo = entries.at(-1)?.occurredOn ?? `${year}-12-31`;

  function handlePurposeChange({ nextPurpose }: { nextPurpose: LedgerPurpose }) {
    setPurpose(nextPurpose);
    syncPurposeToUrl({ purpose: nextPurpose });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">帳簿</h1>
        <p className="text-sm text-muted-foreground">{ledgerPurposeTabLabels[purpose]}の法定記録</p>
      </div>

      <PurposeFilter current={purpose} onPurposeChange={handlePurposeChange} />

      <ActivePermitStatus
        permits={permits}
        ledgerPurpose={purpose}
        permitBalance={permitBalance}
        today={today}
      />

      <HomeStorageWarning
        currentStock={homeStorage.currentStock}
        peakStock={homeStorage.peakStock}
      />

      <div className="flex flex-col gap-3 border-b border-border/40 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-x-6">
          <div className="min-w-0">
            <dt className="text-muted-foreground">氏名</dt>
            <dd className="font-medium">{ownerName}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">件数</dt>
            <dd className="font-medium tabular-nums">{purposeEntries.length}件</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">帳簿残数（全用途）</dt>
            <dd className="font-medium tabular-nums">
              {homeStorage.currentStock.toLocaleString("ja-JP")}発
            </dd>
          </div>
        </dl>
        <Link
          href={`/lab/ammo-ledger/ledger/print?from=${printFrom}&to=${printTo}`}
          className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          すべて印刷する →
        </Link>
      </div>

      <LedgerTableShell
        entries={purposeEntries}
        permitBalances={permitBalances}
        homeStorageExceededEntryIds={homeStorage.exceededEntryIds}
      />

      <AmmoLedgerRefreshIndicator visible={isRefreshing} />
    </div>
  );
}

export function LedgerView() {
  const { workspace, ownerName, isLoading, isRefreshing } = useAmmoLedgerWorkspace();

  if (isLoading || !workspace || !ownerName) {
    return <WorkspaceViewLoader />;
  }

  return (
    <LedgerViewContent workspace={workspace} ownerName={ownerName} isRefreshing={isRefreshing} />
  );
}
