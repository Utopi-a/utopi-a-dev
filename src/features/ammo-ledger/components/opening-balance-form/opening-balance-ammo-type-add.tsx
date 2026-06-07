"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { createAmmoTypeAction } from "@/features/ammo-ledger/master/create-ammo-type/create-ammo-type-action";
import { buildAmmoTypeLabel } from "@/features/ammo-ledger/schema/build-ammo-type-label";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { listShotGaugeSelectOptions } from "@/features/ammo-ledger/schema/shot-gauge-options";
import type { ShotType } from "@/features/ammo-ledger/schema/shot-type";
import { shotTypeLabels, shotTypes } from "@/features/ammo-ledger/schema/shot-type";

type OpeningBalanceAmmoTypeAddProps = {
  defaultPurpose: LedgerPurpose;
};

export function OpeningBalanceAmmoTypeAdd({ defaultPurpose }: OpeningBalanceAmmoTypeAddProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [caliber, setCaliber] = useState("12番");
  const [shotType, setShotType] = useState<string>(shotTypes[1]);
  const [gaugeNumber, setGaugeNumber] = useState("");
  const [roundsPerBox, setRoundsPerBox] = useState("25");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const gaugeSelectOptions = useMemo(
    () => listShotGaugeSelectOptions({ defaultPurpose }),
    [defaultPurpose],
  );

  const previewLabel = buildAmmoTypeLabel({
    caliber,
    shotType: shotType as ShotType,
    gaugeNumber: gaugeNumber || undefined,
  });

  async function handleAdd() {
    if (!caliber.trim() || !roundsPerBox || Number(roundsPerBox) < 1) {
      setError("入力内容を確認してください");
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await createAmmoTypeAction({
      caliber,
      shotType,
      gaugeNumber: gaugeNumber || undefined,
      roundsPerBox: Number(roundsPerBox),
      defaultPurpose,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.refresh();
    setIsOpen(false);
    setGaugeNumber("");
    setIsPending(false);
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        弾種を追加
      </Button>
    );
  }

  return (
    <div className="space-y-3 border-t border-border/50 pt-4">
      <p className="text-sm font-medium">弾種を追加</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="add-caliber">番径</Label>
          <Input
            id="add-caliber"
            value={caliber}
            onChange={(event) => setCaliber(event.target.value)}
          />
        </div>
        <FieldSelect
          id="add-shot-type"
          label="単弾 / 散弾"
          value={shotType}
          onChange={setShotType}
          options={shotTypes.map((type) => ({ value: type, label: shotTypeLabels[type] }))}
          placeholder=""
        />
        <FieldSelect
          id="add-gauge-number"
          label="号数（散弾のみ）"
          value={gaugeNumber}
          onChange={setGaugeNumber}
          options={gaugeSelectOptions}
          placeholder="未選択"
        />
        <div className="space-y-2">
          <Label htmlFor="add-rounds-per-box">1箱あたり発数</Label>
          <Input
            id="add-rounds-per-box"
            type="number"
            min={1}
            value={roundsPerBox}
            onChange={(event) => setRoundsPerBox(event.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">表示名: {previewLabel}</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={isPending} onClick={handleAdd}>
          {isPending ? "追加中…" : "追加して一覧に反映"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setIsOpen(false)}
        >
          キャンセル
        </Button>
      </div>
    </div>
  );
}
