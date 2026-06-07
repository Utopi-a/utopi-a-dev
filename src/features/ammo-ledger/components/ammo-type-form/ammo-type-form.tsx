"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { createAmmoTypeAction } from "@/features/ammo-ledger/master/create-ammo-type/create-ammo-type-action";
import { updateAmmoTypeAction } from "@/features/ammo-ledger/master/update-ammo-type/update-ammo-type-action";
import { buildAmmoTypeLabel } from "@/features/ammo-ledger/schema/build-ammo-type-label";
import { shotGaugeOptions } from "@/features/ammo-ledger/schema/shot-gauge-options";
import type { ShotType } from "@/features/ammo-ledger/schema/shot-type";
import { shotTypeLabels, shotTypes } from "@/features/ammo-ledger/schema/shot-type";

type AmmoTypeFormProps = {
  recordId?: string;
  initialValues?: {
    name: string;
    caliber: string;
    shotType: string;
    gaugeNumber?: string | null;
    roundsPerBox: number;
    defaultPurpose?: string | null;
    memo?: string | null;
  };
};

export function AmmoTypeForm({ recordId, initialValues }: AmmoTypeFormProps = {}) {
  const router = useRouter();
  const isEdit = Boolean(recordId);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [caliber, setCaliber] = useState(initialValues?.caliber ?? "12番");
  const [shotType, setShotType] = useState<string>(initialValues?.shotType ?? shotTypes[1]);
  const [gaugeNumber, setGaugeNumber] = useState(initialValues?.gaugeNumber ?? "");
  const [roundsPerBox, setRoundsPerBox] = useState(initialValues?.roundsPerBox?.toString() ?? "25");
  const [defaultPurpose, setDefaultPurpose] = useState(initialValues?.defaultPurpose ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const previewLabel = buildAmmoTypeLabel({
    name: name || undefined,
    caliber,
    shotType: shotType as ShotType,
    gaugeNumber: gaugeNumber || undefined,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const payload = {
      name: name || undefined,
      caliber,
      shotType,
      gaugeNumber: gaugeNumber || undefined,
      roundsPerBox: Number(roundsPerBox),
      defaultPurpose: defaultPurpose || undefined,
      memo: memo || undefined,
    };

    const result = isEdit
      ? await updateAmmoTypeAction({ id: recordId!, input: payload })
      : await createAmmoTypeAction(payload);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

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
          <Label htmlFor="caliber">番径</Label>
          <Input
            id="caliber"
            required
            value={caliber}
            onChange={(e) => setCaliber(e.target.value)}
          />
        </div>
        <FieldSelect
          id="shot-type"
          label="単弾 / 散弾"
          value={shotType}
          onChange={setShotType}
          options={shotTypes.map((t) => ({ value: t, label: shotTypeLabels[t] }))}
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
        <FieldSelect
          id="gauge-number"
          label="号数（散弾のみ）"
          value={gaugeNumber}
          onChange={setGaugeNumber}
          options={shotGaugeOptions.map((g) => ({ value: g, label: `${g}号` }))}
          placeholder="未選択"
        />
        <p className="text-xs text-muted-foreground">帳簿出力には使いません。管理用の詳細です。</p>
        <div className="space-y-2">
          <Label htmlFor="ammo-name">名称</Label>
          <Input
            id="ammo-name"
            placeholder="空欄なら下の表示名を使います"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default-purpose">標準用途</Label>
          <Input
            id="default-purpose"
            value={defaultPurpose}
            onChange={(e) => setDefaultPurpose(e.target.value)}
          />
        </div>
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
