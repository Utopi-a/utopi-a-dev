"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LedgerYearSelect } from "@/features/ammo-ledger/components/ledger-year-select/ledger-year-select";
import { OpeningBalanceAmmoTypeAdd } from "@/features/ammo-ledger/components/opening-balance-form/opening-balance-ammo-type-add";
import {
  type OpeningBalancePermitCarryoverFormRow,
  OpeningBalancePermitCarryoverList,
} from "@/features/ammo-ledger/components/opening-balance-form/opening-balance-permit-carryover-list";
import { PurposeFilter } from "@/features/ammo-ledger/components/purpose-filter/purpose-filter";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { buildLedgerHref } from "@/features/ammo-ledger/ledger/build-ledger-href/build-ledger-href";
import { useAmmoLedgerMutationNavigation } from "@/features/ammo-ledger/navigation/use-ammo-ledger-mutation-navigation/use-ammo-ledger-mutation-navigation";
import { buildOpeningBalanceHref } from "@/features/ammo-ledger/opening-balance/build-opening-balance-href/build-opening-balance-href";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import type { PriorYearEndStock } from "@/features/ammo-ledger/opening-balance/compute-prior-year-end-stock/compute-prior-year-end-stock";
import type { OpeningBalanceSnapshot } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { saveOpeningBalanceAction } from "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action";
import type { AcquisitionPermitName } from "@/features/ammo-ledger/schema/acquisition-permit-name-options";
import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
  ledgerPurposeTabLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { useRequestAmmoLedgerWorkspaceRevalidation } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type OpeningBalanceAmmoType = {
  id: string;
  name: string;
  gaugeNumber: string | null;
  roundsPerBox: number;
};

type OpeningBalanceFormProps = {
  years: number[];
  initialYear: number;
  initialPurpose: LedgerPurpose;
  ammoTypes: OpeningBalanceAmmoType[];
  snapshotsByPurpose: Record<LedgerPurpose, OpeningBalanceSnapshot>;
  priorYearEndStockByPurpose: PriorYearEndStock;
};

function formatGauge({ gaugeNumber }: { gaugeNumber: string | null }): string {
  return gaugeNumber ? `${gaugeNumber}号` : "—";
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

type OpeningBalanceDraft = {
  permitCarryoverRows: OpeningBalancePermitCarryoverFormRow[];
  stockByAmmoType: Record<string, string>;
};

function toPermitCarryoverRows({
  snapshot,
}: {
  snapshot: OpeningBalanceSnapshot;
}): OpeningBalancePermitCarryoverFormRow[] {
  return snapshot.permitCarryovers.map((carryover) => ({
    clientKey: carryover.permitId,
    permitId: carryover.permitId,
    name: carryover.name as AcquisitionPermitName,
    permitPurpose: carryover.permitPurpose as AcquisitionPermitPurpose,
    quantity: String(carryover.quantity),
    expiresOn: carryover.expiresOn,
  }));
}

function resolveStockInputValue({
  ammoTypeId,
  draft,
  snapshot,
}: {
  ammoTypeId: string;
  draft: OpeningBalanceDraft | undefined;
  snapshot: OpeningBalanceSnapshot;
}): string {
  return (
    draft?.stockByAmmoType[ammoTypeId] ??
    (snapshot.stockByAmmoType[ammoTypeId] !== undefined
      ? String(snapshot.stockByAmmoType[ammoTypeId])
      : "")
  );
}

function buildOpeningBalanceInput({
  ammoTypes,
  draft,
  snapshot,
}: {
  ammoTypes: OpeningBalanceAmmoType[];
  draft: OpeningBalanceDraft | undefined;
  snapshot: OpeningBalanceSnapshot;
}) {
  const permitCarryoverRows = draft?.permitCarryoverRows ?? toPermitCarryoverRows({ snapshot });
  return {
    permitCarryovers: permitCarryoverRows.map((row) => ({
      permitId: row.permitId,
      name: row.name,
      permitPurpose: row.permitPurpose,
      quantity: Number(row.quantity) || 0,
      expiresOn: row.expiresOn,
    })),
    stockByAmmoType: Object.fromEntries(
      ammoTypes.flatMap((type) => {
        const value = resolveStockInputValue({ ammoTypeId: type.id, draft, snapshot }).trim();
        return value === "" ? [] : [[type.id, Number(value)]];
      }),
    ) as Record<string, number>,
  };
}

export function OpeningBalanceForm({
  years,
  initialYear,
  initialPurpose,
  ammoTypes,
  snapshotsByPurpose,
  priorYearEndStockByPurpose,
}: OpeningBalanceFormProps) {
  const router = useRouter();
  const navigateAfterMutation = useAmmoLedgerMutationNavigation();
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  const [purpose, setPurpose] = useState<LedgerPurpose>(initialPurpose);

  useEffect(() => {
    setPurpose(initialPurpose);
  }, [initialPurpose]);

  // 入力した値だけを用途ごとに保持し、未入力の欄は最新の snapshot を表示する。
  // 弾種追加の再描画や用途の切替で、保存前の入力を snapshot で上書きしない。
  const [draftsByPurpose, setDraftsByPurpose] = useState<
    Partial<Record<LedgerPurpose, OpeningBalanceDraft>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [fillNotice, setFillNotice] = useState<string | null>(null);
  const [unsavedNotice, setUnsavedNotice] = useState<string | null>(null);
  // 帳簿へ移らずに保存したとき、再取得した snapshot が届くまでの比較元にする。
  const [savedInputByPurpose, setSavedInputByPurpose] = useState<
    Partial<Record<LedgerPurpose, string>>
  >({});
  const [isPending, setIsPending] = useState(false);

  const snapshot = snapshotsByPurpose[purpose];
  const priorYearEndStock = priorYearEndStockByPurpose[purpose] ?? {};
  const draft = draftsByPurpose[purpose];
  const permitCarryoverRows = useMemo(
    () => draft?.permitCarryoverRows ?? toPermitCarryoverRows({ snapshot }),
    [draft, snapshot],
  );
  const purposeLabel = ledgerPurposeTabLabels[purpose];
  const openingDay = buildYearOpeningDay({ year });

  const stockInputs = useMemo(
    () =>
      ammoTypes.map((type) => ({
        type,
        value: resolveStockInputValue({ ammoTypeId: type.id, draft, snapshot }),
      })),
    [ammoTypes, draft, snapshot],
  );
  const unsavedPurposes = ledgerPurposes.filter((target) => {
    const targetDraft = draftsByPurpose[target];
    if (!targetDraft) return false;
    const targetSnapshot = snapshotsByPurpose[target];
    const savedInput =
      savedInputByPurpose[target] ??
      JSON.stringify(
        buildOpeningBalanceInput({ ammoTypes, draft: undefined, snapshot: targetSnapshot }),
      );
    return (
      JSON.stringify(
        buildOpeningBalanceInput({ ammoTypes, draft: targetDraft, snapshot: targetSnapshot }),
      ) !== savedInput
    );
  });
  // 残数0の弾種は繰り越す実包がないため、空欄（繰越なし）のままにする。
  const fillableAmmoTypeIds = stockInputs
    .filter(({ type, value }) => value.trim() === "" && (priorYearEndStock[type.id] ?? 0) > 0)
    .map(({ type }) => type.id);

  function updateDraft({
    update,
  }: {
    update: (current: OpeningBalanceDraft) => OpeningBalanceDraft;
  }) {
    setDraftsByPurpose((current) => ({
      ...current,
      [purpose]: update(
        current[purpose] ?? {
          permitCarryoverRows: toPermitCarryoverRows({ snapshot }),
          stockByAmmoType: {},
        },
      ),
    }));
  }

  function handleYearChange({ year: nextYear }: { year: number }) {
    router.push(
      buildOpeningBalanceHref({ occurredOn: buildYearOpeningDay({ year: nextYear }), purpose }),
    );
  }

  function handleStockChange({ ammoTypeId, value }: { ammoTypeId: string; value: string }) {
    updateDraft({
      update: (current) => ({
        ...current,
        stockByAmmoType: { ...current.stockByAmmoType, [ammoTypeId]: value },
      }),
    });
  }

  function handleFillPriorYearEndStock() {
    updateDraft({
      update: (current) => ({
        ...current,
        stockByAmmoType: {
          ...current.stockByAmmoType,
          ...Object.fromEntries(
            fillableAmmoTypeIds.map((ammoTypeId) => [
              ammoTypeId,
              String(priorYearEndStock[ammoTypeId]),
            ]),
          ),
        },
      }),
    });
    setFillNotice(
      `${fillableAmmoTypeIds.length}件の弾種に前年末の残数を入れました。保存すると繰越として登録します。`,
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setUnsavedNotice(null);

    try {
      const input = buildOpeningBalanceInput({ ammoTypes, draft, snapshot });
      const result = await saveOpeningBalanceAction({ year, purpose, ...input });

      if (!result.ok) {
        setError(result.error);

        return;
      }

      showAmmoLedgerToast({ action: "saved", subject: "年初繰越" });
      // 保存は表示中の用途だけなので、他の用途の入力を残したまま帳簿へ移らない。
      const otherUnsavedPurposes = unsavedPurposes.filter((target) => target !== purpose);
      if (otherUnsavedPurposes.length > 0) {
        setSavedInputByPurpose((current) => ({ ...current, [purpose]: JSON.stringify(input) }));
        setUnsavedNotice(
          `${ledgerPurposeLabels[purpose]}の繰越を保存しました。${otherUnsavedPurposes
            .map((target) => ledgerPurposeLabels[target])
            .join("・")}の入力がまだ保存されていません。`,
        );
        requestRevalidation();
        router.refresh();
        return;
      }
      navigateAfterMutation({ href: buildLedgerHref({ purpose }) });
    } catch {
      setError("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="max-w-xs">
        <LedgerYearSelect years={years} value={year} onChange={handleYearChange} label="対象年" />
        <p className="mt-2 text-xs text-muted-foreground">各年の1月1日付で繰越を登録します。</p>
        {unsavedPurposes.length > 0 ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            年を切り替えると、保存していない入力は消えます。
          </p>
        ) : null}
      </div>

      <PurposeFilter
        current={purpose}
        onPurposeChange={({ nextPurpose }) => {
          setPurpose(nextPurpose);
          setFillNotice(null);
        }}
      />

      <section className="space-y-3">
        <SectionHeading
          title={`${year}年 ${purposeLabel} — 許可残数`}
          description="譲り受け許可と同じ項目で、種別・目的・残数・有効期限を登録します。"
        />
        <OpeningBalancePermitCarryoverList
          year={year}
          purpose={purpose}
          rows={permitCarryoverRows}
          openingDay={openingDay}
          onChange={({ rows }) =>
            updateDraft({ update: (current) => ({ ...current, permitCarryoverRows: rows }) })
          }
        />
      </section>

      <section className="space-y-3">
        <SectionHeading
          title={`${year}年 ${purposeLabel} — 残弾数`}
          description="アプリで記録を続けている場合は前年末の残数を入れて保存します。紙の帳簿から移行する場合は1月1日時点の残数を入力します。空欄の弾種は繰越を登録しません（登録済みの繰越は取り消します）。0を入れると残数0として登録します。"
        />

        {Object.keys(priorYearEndStock).length > 0 ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fillableAmmoTypeIds.length === 0}
              onClick={handleFillPriorYearEndStock}
            >
              前年末の残数を入れる
            </Button>
            <p className="text-xs text-muted-foreground">
              空欄の弾種に、{year - 1}
              年末の帳簿残数を入れます。入力済みの弾種と残数0の弾種はそのままです。
            </p>
            {fillNotice ? (
              <p role="status" className="text-xs font-medium">
                {fillNotice}
              </p>
            ) : null}
          </div>
        ) : null}

        {ammoTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだ弾種がありません。下の「弾種を追加」から登録してください。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-1 py-2 font-medium">弾種</th>
                  {/* 弾種名に号数が入るため、狭い画面では号数の列を省いて横にはみ出さないようにする。 */}
                  <th className="hidden px-1 py-2 font-medium sm:table-cell">号数</th>
                  <th className="w-36 px-1 py-2 text-right font-medium">繰越残数（個）</th>
                </tr>
              </thead>
              <tbody>
                {stockInputs.map(({ type, value }) => (
                  <tr key={type.id} className="border-b border-border/40 last:border-0">
                    <td className="px-1 py-2 font-medium break-words">{type.name}</td>
                    <td className="hidden px-1 py-2 text-muted-foreground sm:table-cell">
                      {formatGauge({ gaugeNumber: type.gaugeNumber })}
                    </td>
                    <td className="px-1 py-2">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={value}
                        aria-label={`${type.name}の繰越残数`}
                        onChange={(event) =>
                          handleStockChange({ ammoTypeId: type.id, value: event.target.value })
                        }
                        className="ml-auto max-w-32 text-right tabular-nums"
                      />
                      {priorYearEndStock[type.id] !== undefined ? (
                        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                          前年末の帳簿残数 {priorYearEndStock[type.id]}個
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <OpeningBalanceAmmoTypeAdd defaultPurpose={purpose} />
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {unsavedNotice ? (
        <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {unsavedNotice}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : `${year}年 ${purposeLabel} の繰越を保存`}
      </Button>
    </form>
  );
}
