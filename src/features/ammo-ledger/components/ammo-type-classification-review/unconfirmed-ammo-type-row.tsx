"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { confirmClassificationAction } from "@/features/ammo-ledger/master/ammo-type-classification-review/confirm-classification-action";
import type { UnconfirmedAmmoType } from "@/features/ammo-ledger/master/ammo-type-classification-review/list-unconfirmed-ammo-types";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import {
  listShotGaugeSelectOptions,
  normalizeGaugeNumberForSelect,
} from "@/features/ammo-ledger/schema/shot-gauge-options";

const cartridgeTypeFormOptions: { value: CartridgeType; label: string }[] = [
  { value: "rifle", label: "ライフル実包" },
  { value: "shotgun_slug", label: "散弾銃用単弾" },
  { value: "shotgun_shot", label: "散弾" },
];

type UnconfirmedAmmoTypeRowProps = {
  ammoType: UnconfirmedAmmoType;
};

export function UnconfirmedAmmoTypeRow({ ammoType }: UnconfirmedAmmoTypeRowProps) {
  const [cartridgeType, setCartridgeType] = useState(ammoType.cartridgeType);
  const [caliber, setCaliber] = useState(ammoType.caliber);
  const [gaugeNumber, setGaugeNumber] = useState(
    normalizeGaugeNumberForSelect({ gaugeNumber: ammoType.gaugeNumber }),
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gaugeSelectOptions = useMemo(() => listShotGaugeSelectOptions(), []);

  function handleCartridgeTypeChange({ next }: { next: string }) {
    setCartridgeType(next);
    if (next !== "shotgun_shot") {
      setGaugeNumber("");
    }
  }

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    const result = await confirmClassificationAction({
      ammoTypeId: ammoType.id,
      cartridgeType,
      caliber,
      gaugeNumber: cartridgeType === "shotgun_shot" ? gaugeNumber || undefined : undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "saved", subject: "弾種分類" });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/50 px-4 py-3">
      <p className="text-sm font-medium">
        {ammoType.name}
        <span className="ml-2 text-xs text-muted-foreground">（1箱{ammoType.roundsPerBox}発）</span>
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <FieldSelect
          id={`ct-${ammoType.id}`}
          label="実包区分"
          value={cartridgeType}
          onChange={(value) => handleCartridgeTypeChange({ next: value })}
          options={cartridgeTypeFormOptions}
          required
          placeholder=""
        />
        <div className="space-y-2">
          <Label htmlFor={`cal-${ammoType.id}`}>実包名称・番径</Label>
          <Input
            id={`cal-${ammoType.id}`}
            required
            value={caliber}
            onChange={(e) => setCaliber(e.target.value)}
          />
        </div>
        {cartridgeType === "shotgun_shot" ? (
          <FieldSelect
            id={`gn-${ammoType.id}`}
            label="号数"
            value={gaugeNumber}
            onChange={setGaugeNumber}
            options={gaugeSelectOptions}
            placeholder="未選択"
          />
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" size="sm" disabled={isPending} onClick={handleConfirm}>
        {isPending ? "保存中…" : "確認して保存"}
      </Button>
    </div>
  );
}
