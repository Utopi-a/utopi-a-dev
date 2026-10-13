"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ActivePermitStatus } from "@/features/ammo-ledger/components/active-permit-status/active-permit-status";
import { AmmoLedgerRefreshIndicator } from "@/features/ammo-ledger/components/ammo-ledger-refresh-indicator/ammo-ledger-refresh-indicator";
import { HomeStorageWarning } from "@/features/ammo-ledger/components/home-storage-warning/home-storage-warning";
import { LedgerLockedThroughLink } from "@/features/ammo-ledger/components/ledger-locked-through-link/ledger-locked-through-link";
import { LedgerTableShell } from "@/features/ammo-ledger/components/ledger-table/ledger-table-shell";
import { LedgerYearSelect } from "@/features/ammo-ledger/components/ledger-year-select/ledger-year-select";
import { PurposeFilter } from "@/features/ammo-ledger/components/purpose-filter/purpose-filter";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import {
  buildAvailableYears,
  buildYearDateRange,
} from "@/features/ammo-ledger/opening-balance/build-available-years/build-available-years";
import {
  computeCurrentPermitState,
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
import { useSavingLedgerChangeCount } from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

function replaceLedgerQuery({ purpose, year }: { purpose: LedgerPurpose; year: number }) {
  const url = new URL(window.location.href);
  url.searchParams.set("purpose", purpose);
  url.searchParams.set("year", String(year));
  window.history.replaceState(null, "", url);
}

type LedgerViewContentProps = {
  workspace: AmmoLedgerWorkspace;
  savingEntryIds: ReadonlySet<string>;
  ownerName: string;
  isRefreshing: boolean;
  highlightedEntryId: string | null;
};

function LedgerViewContent({
  workspace,
  savingEntryIds,
  ownerName,
  isRefreshing,
  highlightedEntryId,
}: LedgerViewContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 帳票は DB から作るため、保存待ちの変更があるうちは印刷へ進ませない。
  const isSaving = useSavingLedgerChangeCount() > 0;
  const purpose = parseLedgerPurpose({ value: searchParams.get("purpose") }) ?? "shooting";
  const today = getTokyoIsoDate();
  const currentYear = Number(today.slice(0, 4));
  const { entries, permitEvents, permits } = workspace;

  const purposeEntries = useMemo(
    () => filterByPurpose({ rows: entries, purpose }),
    [entries, purpose],
  );

  const availableYears = useMemo(() => {
    const dates = [
      ...entries.map((entry) => entry.occurredOn),
      ...permitEvents.map((event) => event.occurredOn),
    ];
    // 未来の日付で記録した行も見落とさないよう、その年まで選べるようにする。
    const latestYear = dates.reduce(
      (latest, date) => Math.max(latest, Number(date.slice(0, 4))),
      currentYear,
    );
    return buildAvailableYears({ dates: [...dates, today], currentYear: latestYear });
  }, [entries, permitEvents, currentYear, today]);

  // 保存直後の遷移は年を持たないため、強調する記録の年を開く。
  const highlightedEntryYear = Number(
    purposeEntries.find((entry) => entry.id === highlightedEntryId)?.occurredOn.slice(0, 4),
  );
  const yearParam = Number(searchParams.get("year"));
  const year = availableYears.includes(yearParam)
    ? yearParam
    : availableYears.includes(highlightedEntryYear)
      ? highlightedEntryYear
      : currentYear;
  const { from, to } = buildYearDateRange({ year });

  const yearEntries = useMemo(
    () => entries.filter((entry) => entry.occurredOn >= from && entry.occurredOn <= to),
    [entries, from, to],
  );
  const entryCounts = useMemo(
    () => ({
      shooting: filterByPurpose({ rows: yearEntries, purpose: "shooting" }).length,
      hunting: filterByPurpose({ rows: yearEntries, purpose: "hunting" }).length,
      pest_control: filterByPurpose({ rows: yearEntries, purpose: "pest_control" }).length,
    }),
    [yearEntries],
  );
  const highlightedEntryExists = highlightedEntryId
    ? yearEntries.some((entry) => entry.id === highlightedEntryId && entry.purpose === purpose)
    : false;

  const purposePermitEvents = useMemo(
    () => filterByPurpose({ rows: permitEvents, purpose }),
    [permitEvents, purpose],
  );

  const permitEventRows = useMemo(
    () =>
      purposePermitEvents.map((event) => ({
        id: event.id,
        permitId: event.permitId,
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
        dayOrder: entry.dayOrder,
        createdAt: entry.createdAt,
        category: entry.category as LedgerCategory,
        quantity: entry.quantity,
      })),
    [purposeEntries],
  );

  const currentPermitState = useMemo(
    () =>
      computeCurrentPermitState({
        permitEvents: permitEventRows,
        ledgerEntries: ledgerEntryRows,
        today,
      }),
    [permitEventRows, ledgerEntryRows, today],
  );

  const permitBalances = useMemo(
    () =>
      computeRunningPermitBalance({
        permitEvents: permitEventRows,
        ledgerEntries: ledgerEntryRows,
        today,
      }),
    [permitEventRows, ledgerEntryRows, today],
  );

  const homeStorage = useMemo(
    () =>
      evaluateHomeStorageLimit({
        entries: entries.map((entry) => ({
          ...entry,
          category: entry.category as LedgerCategory,
        })),
      }),
    [entries],
  );

  function handlePurposeChange({ nextPurpose }: { nextPurpose: LedgerPurpose }) {
    replaceLedgerQuery({ purpose: nextPurpose, year });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">帳簿</h1>
        <p className="text-sm text-muted-foreground">{ledgerPurposeTabLabels[purpose]}の法定記録</p>
        <LedgerLockedThroughLink lockState={workspace.lockState} />
      </div>

      <PurposeFilter
        current={purpose}
        entryCounts={entryCounts}
        onPurposeChange={handlePurposeChange}
      />

      <ActivePermitStatus
        permits={permits}
        ledgerPurpose={purpose}
        permitBalance={currentPermitState.balance}
        remainingByPermitId={currentPermitState.remainingByPermitId}
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
            <dd className="font-medium tabular-nums">{entryCounts[purpose]}件</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">帳簿残数（全用途）</dt>
            <dd className="font-medium tabular-nums">
              {formatStockQuantity({ quantity: homeStorage.currentStock })}
            </dd>
          </div>
        </dl>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="w-full max-w-[10rem] sm:w-36">
            <LedgerYearSelect
              years={availableYears}
              value={year}
              onChange={({ year: nextYear }) => replaceLedgerQuery({ purpose, year: nextYear })}
            />
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => router.push(`/lab/ammo-ledger/ledger/print?year=${year}`)}
            className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "保存が終わると印刷できます" : `${year}年を印刷する →`}
          </button>
        </div>
      </div>

      {highlightedEntryId ? (
        <p
          className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground"
          aria-live="polite"
        >
          {highlightedEntryExists
            ? savingEntryIds.has(highlightedEntryId)
              ? "記録を保存しています。保存が終わるまで編集・取消はできません。"
              : "保存した記録を強調表示しています。"
            : isRefreshing
              ? "帳簿の表示を更新しています…"
              : "指定された記録を表示できません。帳簿を再取得してください。"}
        </p>
      ) : null}

      <LedgerTableShell
        entries={purposeEntries}
        permitEvents={purposePermitEvents}
        permits={permits}
        purpose={purpose}
        today={today}
        from={from}
        to={to}
        permitBalances={permitBalances}
        homeStorageExceededEntryIds={homeStorage.exceededEntryIds}
        highlightedEntryId={highlightedEntryId}
        lockState={workspace.lockState}
        savingEntryIds={savingEntryIds}
      />

      <AmmoLedgerRefreshIndicator visible={isRefreshing} />
    </div>
  );
}

export function LedgerView() {
  const searchParams = useSearchParams();
  const { workspace, pendingEntryIds, ownerName, isLoading, isRefreshing, error, retry } =
    useAmmoLedgerWorkspace();

  if (isLoading || !workspace) {
    return <WorkspaceViewLoader error={error} onRetry={retry} />;
  }

  return (
    <LedgerViewContent
      workspace={workspace}
      savingEntryIds={pendingEntryIds}
      ownerName={ownerName || "（未設定）"}
      isRefreshing={isRefreshing}
      highlightedEntryId={searchParams.get("entry")}
    />
  );
}
