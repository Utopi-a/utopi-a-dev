"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { correctOrphanEntryAction } from "@/features/ammo-ledger/master/ammo-type-classification-review/correct-orphan-entry-action";
import type { OrphanLedgerEntry } from "@/features/ammo-ledger/master/ammo-type-classification-review/list-orphan-ledger-entries";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import { listShotGaugeSelectOptions } from "@/features/ammo-ledger/schema/shot-gauge-options";

const cartridgeTypeFormOptions: { value: CartridgeType; label: string }[] = [
  { value: "rifle", label: "ライフル実包" },
  { value: "shotgun_slug", label: "散弾銃用単弾" },
  { value: "shotgun_shot", label: "散弾" },
];

type OrphanEntryRowProps = {
  entry: OrphanLedgerEntry;
};

export function OrphanEntryRow({ entry }: OrphanEntryRowProps) {
  const [cartridgeType, setCartridgeType] = useState(entry.ammoCartridgeType ?? "");
  const [caliber, setCaliber] = useState(entry.ammoCaliber ?? "");
  const [gaugeNumber, setGaugeNumber] = useState(entry.ammoGaugeNumber ?? "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gaugeSelectOptions = useMemo(() => listShotGaugeSelectOptions(), []);

  const categoryLabel = ledgerCategoryLabels[entry.category as LedgerCategory] ?? entry.category;

  function handleCartridgeTypeChange({ next }: { next: string }) {
    setCartridgeType(next);
    if (next !== "shotgun_shot") {
      setGaugeNumber("");
    }
  }

  async function handleCorrect() {
    setIsPending(true);
    setError(null);

    const result = await correctOrphanEntryAction({
      ledgerEntryId: entry.id,
      cartridgeType,
      caliber,
      gaugeNumber: cartridgeType === "shotgun_shot" ? gaugeNumber || undefined : undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "saved", subject: "帳簿記録" });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/50 px-4 py-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">{entry.ammoTypeName}</span>
        <span className="text-muted-foreground">{entry.occurredOn}</span>
        <span className="text-muted-foreground">{categoryLabel}</span>
        <span className="text-muted-foreground">{entry.quantity}発</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FieldSelect
          id={`oct-${entry.id}`}
          label="実包区分"
          value={cartridgeType}
          onChange={(value) => handleCartridgeTypeChange({ next: value })}
          options={cartridgeTypeFormOptions}
          required
          placeholder="選択してください"
        />
        <div className="space-y-2">
          <Label htmlFor={`ocal-${entry.id}`}>実包名称・番径</Label>
          <Input
            id={`ocal-${entry.id}`}
            required
            value={caliber}
            onChange={(e) => setCaliber(e.target.value)}
          />
        </div>
        {cartridgeType === "shotgun_shot" ? (
          <FieldSelect
            id={`ogn-${entry.id}`}
            label="号数"
            value={gaugeNumber}
            onChange={setGaugeNumber}
            options={gaugeSelectOptions}
            placeholder="未選択"
          />
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        size="sm"
        disabled={isPending || !cartridgeType || !caliber}
        onClick={handleCorrect}
      >
        {isPending ? "保存中…" : "補正して保存"}
      </Button>
    </div>
  );
}
