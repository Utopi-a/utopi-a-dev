"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ammoType } from "@/db/schema/ammo-ledger";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { createTransactionAction } from "@/features/ammo-ledger/transactions/create-transaction/create-transaction-action";

type TransferFormProps = {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  initialValues?: {
    occurredOn?: string;
    ammoTypeId?: string;
    boxCount?: number;
    looseRounds?: number;
  };
};

export function TransferForm({ ammoTypes, initialValues }: TransferFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [occurredOn, setOccurredOn] = useState(initialValues?.occurredOn ?? today);
  const [ammoTypeId, setAmmoTypeId] = useState(initialValues?.ammoTypeId ?? "");
  const [boxCount, setBoxCount] = useState(String(initialValues?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initialValues?.looseRounds ?? 0));
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedAmmoType = ammoTypes.find((t) => t.id === ammoTypeId);

  const computedRounds = useMemo(() => {
    if (!selectedAmmoType) return 0;
    return computeRounds({
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, boxCount, looseRounds]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createTransactionAction({
      inputKind: "transfer",
      occurredOn,
      ammoTypeId,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      counterpartyName,
      counterpartyAddress,
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

      <FieldSelect
        id="ammo-type"
        label="弾"
        value={ammoTypeId}
        onChange={setAmmoTypeId}
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
