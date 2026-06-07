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
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import type { OpeningBalanceSnapshot } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { saveOpeningBalanceAction } from "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action";
import type { AcquisitionPermitName } from "@/features/ammo-ledger/schema/acquisition-permit-name-options";
import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import {
  type LedgerPurpose,
  ledgerPurposeTabLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";

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

export function OpeningBalanceForm({
  years,
  initialYear,
  initialPurpose,
  ammoTypes,
  snapshotsByPurpose,
}: OpeningBalanceFormProps) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  const [purpose, setPurpose] = useState<LedgerPurpose>(initialPurpose);

  useEffect(() => {
    setPurpose(initialPurpose);
  }, [initialPurpose]);

  const [permitCarryoverRows, setPermitCarryoverRows] = useState<
    OpeningBalancePermitCarryoverFormRow[]
  >([]);
  const [stockByAmmoType, setStockByAmmoType] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const snapshot = snapshotsByPurpose[purpose];
    setPermitCarryoverRows(toPermitCarryoverRows({ snapshot }));
    setStockByAmmoType(
      Object.fromEntries(
        ammoTypes.map((type) => [
          type.id,
          snapshot.stockByAmmoType[type.id] !== undefined
            ? String(snapshot.stockByAmmoType[type.id])
            : "",
        ]),
      ),
    );
  }, [purpose, ammoTypes, snapshotsByPurpose]);

  const purposeLabel = ledgerPurposeTabLabels[purpose];
  const openingDay = buildYearOpeningDay({ year });

  const stockInputs = useMemo(
    () =>
      ammoTypes.map((type) => ({
        type,
        value: stockByAmmoType[type.id] ?? "",
      })),
    [ammoTypes, stockByAmmoType],
  );

  function handleYearChange({ year: nextYear }: { year: number }) {
    router.push(`/lab/ammo-ledger/settings/opening-balance?year=${nextYear}`);
  }

  function handleStockChange({ ammoTypeId, value }: { ammoTypeId: string; value: string }) {
    setStockByAmmoType((current) => ({
      ...current,
      [ammoTypeId]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const parsedStock = Object.fromEntries(
      ammoTypes.map((type) => [type.id, Number(stockByAmmoType[type.id]) || 0]),
    );

    const parsedPermitCarryovers = permitCarryoverRows.map((row) => ({
      permitId: row.permitId,
      name: row.name,
      permitPurpose: row.permitPurpose,
      quantity: Number(row.quantity) || 0,
      expiresOn: row.expiresOn,
    }));

    const result = await saveOpeningBalanceAction({
      year,
      purpose,
      permitCarryovers: parsedPermitCarryovers,
      stockByAmmoType: parsedStock,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "saved", subject: "年初繰越" });
    router.push(buildLedgerHref({ purpose }));
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="max-w-xs">
        <LedgerYearSelect years={years} value={year} onChange={handleYearChange} label="対象年" />
        <p className="mt-2 text-xs text-muted-foreground">各年の1月1日付で繰越を登録します。</p>
      </div>

      <PurposeFilter
        current={purpose}
        onPurposeChange={({ nextPurpose }) => setPurpose(nextPurpose)}
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
          onChange={({ rows }) => setPermitCarryoverRows(rows)}
        />
      </section>

      <section className="space-y-3">
        <SectionHeading
          title={`${year}年 ${purposeLabel} — 残弾数`}
          description="弾種ごとに、その年の最初に手元にあった帳簿上の残数を入力します。"
        />

        {ammoTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだ弾種がありません。下の「弾種を追加」から登録してください。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-1 py-2 font-medium">弾種</th>
                  <th className="px-1 py-2 font-medium">号数</th>
                  <th className="px-1 py-2 text-right font-medium">繰越残数（個）</th>
                </tr>
              </thead>
              <tbody>
                {stockInputs.map(({ type, value }) => (
                  <tr key={type.id} className="border-b border-border/40 last:border-0">
                    <td className="px-1 py-2 font-medium">{type.name}</td>
                    <td className="px-1 py-2 text-muted-foreground">
                      {formatGauge({ gaugeNumber: type.gaugeNumber })}
                    </td>
                    <td className="px-1 py-2">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="0"
                        value={value}
                        onChange={(event) =>
                          handleStockChange({ ammoTypeId: type.id, value: event.target.value })
                        }
                        className="ml-auto max-w-32 text-right tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <OpeningBalanceAmmoTypeAdd defaultPurpose={purpose} />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : `${year}年 ${purposeLabel} の繰越を保存`}
      </Button>
    </form>
  );
}
