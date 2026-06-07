"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ammoCounterparty, ammoType } from "@/db/schema/ammo-ledger";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { PackagingFields } from "@/features/ammo-ledger/components/packaging-fields/packaging-fields";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { createTransactionAction } from "@/features/ammo-ledger/transactions/create-transaction/create-transaction-action";

const manualCounterpartyId = "__manual__";

type AcquireFormProps = {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  counterparties: (typeof ammoCounterparty.$inferSelect)[];
  initialValues?: {
    occurredOn?: string;
    ammoTypeId?: string;
    outerBoxCount?: number;
    boxCount?: number;
    looseRounds?: number;
  };
};

export function AcquireForm({ ammoTypes, counterparties, initialValues }: AcquireFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [occurredOn, setOccurredOn] = useState(initialValues?.occurredOn ?? today);
  const [ammoTypeId, setAmmoTypeId] = useState(initialValues?.ammoTypeId ?? "");
  const [counterpartyId, setCounterpartyId] = useState(
    counterparties[0]?.id ?? manualCounterpartyId,
  );
  const [outerBoxCount, setOuterBoxCount] = useState(String(initialValues?.outerBoxCount ?? 0));
  const [boxCount, setBoxCount] = useState(String(initialValues?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initialValues?.looseRounds ?? 0));
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [purpose, setPurpose] = useState<LedgerPurpose>("shooting");
  const [memo, setMemo] = useState("");
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
  const isManualCounterparty = counterpartyId === manualCounterpartyId;

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

    const result = await createTransactionAction({
      inputKind: "acquire",
      purpose,
      occurredOn,
      ammoTypeId,
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      ...(isManualCounterparty ? { counterpartyName, counterpartyAddress } : { counterpartyId }),
      memo: memo || undefined,
    });

    if (result) {
      setError(result.error);
      setIsPending(false);
    }
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
          label: `${t.name}（小箱${t.roundsPerBox}発）`,
        }))}
        required
      />

      <PackagingFields
        outerBoxCount={outerBoxCount}
        boxCount={boxCount}
        looseRounds={looseRounds}
        onOuterBoxCountChange={setOuterBoxCount}
        onBoxCountChange={setBoxCount}
        onLooseRoundsChange={setLooseRounds}
      />

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">譲受数量（法定出力）</p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

      <FieldSelect
        id="counterparty"
        label="譲渡元（購入先）"
        value={counterpartyId}
        onChange={setCounterpartyId}
        options={[
          ...counterparties.map((c) => ({
            value: c.id,
            label: `${c.name}（${c.address}）`,
          })),
          { value: manualCounterpartyId, label: "手入力する" },
        ]}
        required
        placeholder=""
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
