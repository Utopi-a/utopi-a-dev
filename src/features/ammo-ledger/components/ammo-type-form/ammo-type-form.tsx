"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { createAmmoTypeAction } from "@/features/ammo-ledger/master/create-ammo-type/create-ammo-type-action";
import { updateAmmoTypeAction } from "@/features/ammo-ledger/master/update-ammo-type/update-ammo-type-action";
import { buildAmmoTypeLabel } from "@/features/ammo-ledger/schema/build-ammo-type-label";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import { ledgerPurposeLabels, ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  isShotGaugeAllowed,
  listShotGaugeSelectOptions,
  normalizeGaugeNumberForSelect,
} from "@/features/ammo-ledger/schema/shot-gauge-options";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

const cartridgeTypeFormOptions: { value: CartridgeType; label: string }[] = [
  { value: "rifle", label: "ライフル実包" },
  { value: "shotgun_slug", label: "散弾銃用単弾" },
  { value: "shotgun_shot", label: "散弾" },
];

type AmmoTypeFormProps = {
  recordId?: string;
  initialValues?: {
    name: string;
    caliber: string;
    cartridgeType: string;
    gaugeNumber?: string | null;
    roundsPerBox: number;
    defaultPurpose?: string | null;
    memo?: string | null;
  };
};

export function AmmoTypeForm({ recordId, initialValues }: AmmoTypeFormProps = {}) {
  const router = useRouter();
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const isEdit = Boolean(recordId);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [caliber, setCaliber] = useState(initialValues?.caliber ?? "12番");
  const [cartridgeType, setCartridgeType] = useState<string>(
    initialValues?.cartridgeType ?? "shotgun_shot",
  );
  const [gaugeNumber, setGaugeNumber] = useState(
    normalizeGaugeNumberForSelect({ gaugeNumber: initialValues?.gaugeNumber }),
  );
  const [roundsPerBox, setRoundsPerBox] = useState(initialValues?.roundsPerBox?.toString() ?? "25");
  const [defaultPurpose, setDefaultPurpose] = useState(initialValues?.defaultPurpose ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const gaugeSelectOptions = useMemo(
    () => listShotGaugeSelectOptions({ defaultPurpose: defaultPurpose || null }),
    [defaultPurpose],
  );

  function handleCartridgeTypeChange({ nextCartridgeType }: { nextCartridgeType: string }) {
    setCartridgeType(nextCartridgeType);
    if (nextCartridgeType !== "shotgun_shot") {
      setGaugeNumber("");
    }
  }

  function handleDefaultPurposeChange({ nextPurpose }: { nextPurpose: string }) {
    setDefaultPurpose(nextPurpose);
    if (gaugeNumber && !isShotGaugeAllowed({ gaugeNumber, defaultPurpose: nextPurpose || null })) {
      setGaugeNumber("");
    }
  }

  const previewLabel = buildAmmoTypeLabel({
    name: name || undefined,
    caliber,
    cartridgeType: cartridgeType as CartridgeType,
    gaugeNumber: cartridgeType === "shotgun_shot" ? gaugeNumber || undefined : undefined,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const payload = {
      name: name || undefined,
      caliber,
      cartridgeType,
      gaugeNumber: cartridgeType === "shotgun_shot" ? gaugeNumber || undefined : undefined,
      roundsPerBox: Number(roundsPerBox),
      defaultPurpose: defaultPurpose || undefined,
      memo: memo || undefined,
    };

    const result = recordId
      ? await updateAmmoTypeAction({ id: recordId, input: payload })
      : await createAmmoTypeAction(payload);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({
      action: isEdit ? "updated" : "created",
      subject: "弾種",
    });
    await invalidateWorkspace();

    if (isEdit) {
      router.push("/lab/ammo-ledger/settings/ammo-types");
      return;
    }

    router.refresh();
    setName("");
    setGaugeNumber("");
    setDefaultPurpose("");
    setMemo("");
    setIsPending(false);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <p className="text-sm font-medium">基本</p>
        <div className="space-y-2">
          <Label htmlFor="caliber">実包名称・番径</Label>
          <p className="text-xs text-muted-foreground">
            ライフルは口径（例: .308WIN）、ショットガンは番径（例: 12番）を入力します。
          </p>
          <Input
            id="caliber"
            required
            value={caliber}
            onChange={(e) => setCaliber(e.target.value)}
          />
        </div>
        <FieldSelect
          id="cartridge-type"
          label="実包区分"
          value={cartridgeType}
          onChange={(value) => handleCartridgeTypeChange({ nextCartridgeType: value })}
          options={cartridgeTypeFormOptions}
          required
          placeholder=""
        />
        <div className="space-y-2">
          <Label htmlFor="rounds-per-box">1箱あたり発数</Label>
          <Input
            id="rounds-per-box"
            type="number"
            min={1}
            required
            value={roundsPerBox}
            onChange={(e) => setRoundsPerBox(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border/70 px-4 py-4">
        <p className="text-sm font-medium">詳細（任意）</p>
        {cartridgeType === "shotgun_shot" ? (
          <FieldSelect
            id="gauge-number"
            label="号数（散弾のみ）"
            value={gaugeNumber}
            onChange={setGaugeNumber}
            options={gaugeSelectOptions}
            placeholder="未選択"
          />
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="ammo-name">名称</Label>
          <Input
            id="ammo-name"
            placeholder="空欄なら下の表示名を使います"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <FieldSelect
          id="default-purpose"
          label="標準用途"
          value={defaultPurpose}
          onChange={(value) => handleDefaultPurposeChange({ nextPurpose: value })}
          options={ledgerPurposes.map((purpose) => ({
            value: purpose,
            label: ledgerPurposeLabels[purpose],
          }))}
          placeholder="未選択"
        />
        <div className="space-y-2">
          <Label htmlFor="memo">メモ</Label>
          <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">表示名プレビュー</p>
        <p className="font-semibold">{previewLabel}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : isEdit ? "変更を保存" : "弾種を追加"}
      </Button>
    </form>
  );
}
