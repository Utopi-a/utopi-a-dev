"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ammoType } from "@/db/schema/ammo-ledger";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { createTransactionAction } from "@/features/ammo-ledger/transactions/create-transaction/create-transaction-action";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type TransferFormProps = {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  counterpartyPickerData: MasterPickerData;
  initialValues?: {
    occurredOn?: string;
    ammoTypeId?: string;
    boxCount?: number;
    looseRounds?: number;
  };
};

export function TransferForm({
  ammoTypes,
  counterpartyPickerData,
  initialValues,
}: TransferFormProps) {
  const router = useRouter();
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const today = new Date().toISOString().slice(0, 10);

  const [occurredOn, setOccurredOn] = useState(initialValues?.occurredOn ?? today);
  const [ammoTypeId, setAmmoTypeId] = useState(initialValues?.ammoTypeId ?? "");
  const [purpose, setPurpose] = useState<LedgerPurpose>("shooting");
  const [counterpartyId, setCounterpartyId] = useState(
    counterpartyPickerData.recent[0]?.id ??
      counterpartyPickerData.registered[0]?.id ??
      manualCounterpartyId,
  );
  const [boxCount, setBoxCount] = useState(String(initialValues?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initialValues?.looseRounds ?? 0));
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedAmmoType = ammoTypes.find((t) => t.id === ammoTypeId);
  const isManualCounterparty = counterpartyId === manualCounterpartyId;

  const computedRounds = useMemo(() => {
    if (!selectedAmmoType) return 0;
    return computeRounds({
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, boxCount, looseRounds]);

  function handleAmmoTypeChange({ nextAmmoTypeId }: { nextAmmoTypeId: string }) {
    setAmmoTypeId(nextAmmoTypeId);
    const nextType = ammoTypes.find((t) => t.id === nextAmmoTypeId);
    if (nextType) {
      setPurpose(resolveDefaultPurpose({ defaultPurpose: nextType.defaultPurpose }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createTransactionAction({
      inputKind: "transfer",
      purpose,
      occurredOn,
      ammoTypeId,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      ...(isManualCounterparty ? { counterpartyName, counterpartyAddress } : { counterpartyId }),
      memo: memo || undefined,
    });

    if (result.ok) {
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
        <Input
          id="occurred-on"
          type="date"
          required
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
        />
      </div>

      <PurposeSelect value={purpose} onChange={setPurpose} />

      <FieldSelect
        id="ammo-type"
        label="弾"
        value={ammoTypeId}
        onChange={(value) => handleAmmoTypeChange({ nextAmmoTypeId: value })}
        options={ammoTypes.map((t) => ({
          value: t.id,
          label: `${t.name}（1箱${t.roundsPerBox}発）`,
        }))}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="box-count">箱数</Label>
          <Input
            id="box-count"
            type="number"
            min={0}
            value={boxCount}
            onChange={(e) => setBoxCount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loose-rounds">バラ</Label>
          <Input
            id="loose-rounds"
            type="number"
            min={0}
            value={looseRounds}
            onChange={(e) => setLooseRounds(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">譲渡数量（法定出力）</p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

      <MasterPicker
        id="counterparty"
        label="譲渡先"
        value={counterpartyId}
        onChange={setCounterpartyId}
        catalogKind="gun_shop"
        pickerData={counterpartyPickerData}
        sheetTitle="譲渡先を選ぶ"
        manualOption={{ value: manualCounterpartyId, label: "手入力" }}
        required
      />

      {isManualCounterparty ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="counterparty-name">相手方氏名</Label>
            <Input
              id="counterparty-name"
              required
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="counterparty-address">相手方住所</Label>
            <Input
              id="counterparty-address"
              required
              value={counterpartyAddress}
              onChange={(e) => setCounterpartyAddress(e.target.value)}
            />
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="memo">メモ（帳簿には出ません）</Label>
        <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending || computedRounds <= 0}>
        {isPending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
