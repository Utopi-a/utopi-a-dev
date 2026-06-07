"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LedgerYearSelect } from "@/features/ammo-ledger/components/ledger-year-select/ledger-year-select";
import { OpeningBalanceAmmoTypeAdd } from "@/features/ammo-ledger/components/opening-balance-form/opening-balance-ammo-type-add";
import { PurposeFilter } from "@/features/ammo-ledger/components/purpose-filter/purpose-filter";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import type { OpeningBalanceSnapshot } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { saveOpeningBalanceAction } from "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action";
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

export function OpeningBalanceForm({
  years,
  initialYear,
  ammoTypes,
  snapshotsByPurpose,
}: OpeningBalanceFormProps) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  const [purpose, setPurpose] = useState<LedgerPurpose>("shooting");
  const [permitBalance, setPermitBalance] = useState("");
  const [stockByAmmoType, setStockByAmmoType] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const snapshot = snapshotsByPurpose[purpose];
    setPermitBalance(snapshot.permitBalance !== null ? String(snapshot.permitBalance) : "");
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
    const parsedPermit = permitBalance.trim() === "" ? null : Number(permitBalance) || 0;

    const result = await saveOpeningBalanceAction({
      year,
      purpose,
      permitBalance: parsedPermit,
      stockByAmmoType: parsedStock,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "saved", subject: "年初繰越" });
    router.refresh();
    setIsPending(false);
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
          description="その年の最初に残っている譲り受け許可の残数です。"
        />
        <div className="max-w-xs space-y-2">
          <Label htmlFor="permit-balance">許可残数（発）</Label>
          <Input
            id="permit-balance"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="例: 3200"
            value={permitBalance}
            onChange={(event) => setPermitBalance(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            空欄または0にすると、{year}年の許可残数繰越を削除します。
          </p>
        </div>
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
                  <th className="px-1 py-2 text-right font-medium">繰越残数（発）</th>
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
