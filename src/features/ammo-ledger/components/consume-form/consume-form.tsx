"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoGun, ammoType } from "@/db/schema/ammo-ledger";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PackagingFields } from "@/features/ammo-ledger/components/packaging-fields/packaging-fields";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { buildAmmoTypeFieldOptions } from "@/features/ammo-ledger/master/build-ammo-type-field-options/build-ammo-type-field-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { createTransactionAction } from "@/features/ammo-ledger/transactions/create-transaction/create-transaction-action";
import { updateTransactionAction } from "@/features/ammo-ledger/transactions/update-transaction/update-transaction-action";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type ConsumeFormProps = {
  guns: (typeof ammoGun.$inferSelect)[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
  ledgerEntryId?: string;
  initialValues?: {
    occurredOn?: string;
    purpose?: LedgerPurpose;
    ammoTypeId?: string;
    gunId?: string;
    rangeId?: string;
    outerBoxCount?: number;
    boxCount?: number;
    looseRounds?: number;
    memo?: string;
  };
};

export function ConsumeForm({
  guns,
  ammoTypes,
  stockByAmmoTypeId,
  ledgerEntryId,
  initialValues,
}: ConsumeFormProps) {
  const router = useRouter();
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const today = new Date().toISOString().slice(0, 10);

  const [occurredOn, setOccurredOn] = useState(initialValues?.occurredOn ?? today);
  const [ammoTypeId, setAmmoTypeId] = useState(initialValues?.ammoTypeId ?? "");
  const [gunId, setGunId] = useState(initialValues?.gunId ?? "");
  const [rangeId, setRangeId] = useState(initialValues?.rangeId ?? "");
  const [outerBoxCount, setOuterBoxCount] = useState(String(initialValues?.outerBoxCount ?? 0));
  const [boxCount, setBoxCount] = useState(String(initialValues?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initialValues?.looseRounds ?? 0));
  const [purpose, setPurpose] = useState<LedgerPurpose>(initialValues?.purpose ?? "shooting");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedAmmoType = ammoTypes.find((t) => t.id === ammoTypeId);

  function handleAmmoTypeChange({ nextAmmoTypeId }: { nextAmmoTypeId: string }) {
    setAmmoTypeId(nextAmmoTypeId);
    const nextType = ammoTypes.find((t) => t.id === nextAmmoTypeId);
    if (nextType) {
      setPurpose(resolveDefaultPurpose({ defaultPurpose: nextType.defaultPurpose }));
    }
  }

  const ammoTypeOptions = useMemo(
    () => buildAmmoTypeFieldOptions({ ammoTypes, stockByAmmoTypeId }),
    [ammoTypes, stockByAmmoTypeId],
  );

  const computedRounds = useMemo(() => {
    if (!selectedAmmoType) return 0;
    return computeRounds({
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, outerBoxCount, boxCount, looseRounds]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const payload = {
      inputKind: "consume" as const,
      purpose,
      occurredOn,
      ammoTypeId,
      gunId,
      rangeId,
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      memo: memo || undefined,
    };

    const result = ledgerEntryId
      ? await updateTransactionAction({ ledgerEntryId, ...payload })
      : await createTransactionAction(payload);

    if (result.ok) {
      showAmmoLedgerToast({
        action: ledgerEntryId ? "updated" : "created",
        subject: "消費記録",
      });
      await invalidateWorkspace();
      router.push(result.redirectPath);
      return;
    }

    setError(result.error);
    setIsPending(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="occurred-on">日付</Label>
        <IsoDateInput
          id="occurred-on"
          required
          value={occurredOn}
          onChange={({ value }) => setOccurredOn(value)}
        />
      </div>

      <MasterPicker
        id="range"
        label="場所"
        value={rangeId}
        onChange={setRangeId}
        catalogKind="range"
        sheetTitle="射撃場を選ぶ"
        required
      />

      <FieldSelect
        id="gun"
        label="銃"
        value={gunId}
        onChange={setGunId}
        options={guns.map((g) => ({
          value: g.id,
          label: `${g.name}（${g.gunNumber} / ${g.permitNumber}）`,
        }))}
        required
      />

      <PurposeSelect value={purpose} onChange={setPurpose} />

      <FieldSelect
        id="ammo-type"
        label="弾"
        value={ammoTypeId}
        onChange={(value) => handleAmmoTypeChange({ nextAmmoTypeId: value })}
        options={ammoTypeOptions}
        required
      />

      <PackagingFields
        outerBoxCount={outerBoxCount}
        boxCount={boxCount}
        looseRounds={looseRounds}
        onOuterBoxCountChange={setOuterBoxCount}
        onBoxCountChange={setBoxCount}
        onLooseRoundsChange={setLooseRounds}
        looseLabel="バラ（±）"
      />

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">実消費（法定出力に使われる数量）</p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">メモ（帳簿には出ません）</Label>
        <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending || computedRounds <= 0}>
        {isPending ? "保存中…" : ledgerEntryId ? "更新" : "保存"}
      </Button>
    </form>
  );
}
