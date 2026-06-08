"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { buildLedgerHref } from "@/features/ammo-ledger/ledger/build-ledger-href/build-ledger-href";
import { createPermitEventAction } from "@/features/ammo-ledger/permit/create-permit-event/create-permit-event-action";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  permitEventKindLabels,
  permitEventKinds,
} from "@/features/ammo-ledger/schema/permit-event-kind";

export function PermitEventForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [purpose, setPurpose] = useState<LedgerPurpose>("shooting");
  const [eventKind, setEventKind] = useState<string>(permitEventKinds[0]);
  const [occurredOn, setOccurredOn] = useState(today);
  const [quantity, setQuantity] = useState("0");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createPermitEventAction({
      purpose,
      eventKind,
      occurredOn,
      quantity: Number(quantity) || 0,
      memo: memo || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "created", subject: "許可イベント" });
    router.push(buildLedgerHref({ purpose }));
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <PurposeSelect value={purpose} onChange={setPurpose} />

      <FieldSelect
        id="event-kind"
        label="イベント種別"
        value={eventKind}
        onChange={setEventKind}
        options={permitEventKinds.map((kind) => ({
          value: kind,
          label: permitEventKindLabels[kind],
        }))}
        required
        placeholder=""
      />

      <div className="space-y-2">
        <Label htmlFor="occurred-on">日付</Label>
        <IsoDateInput
          id="occurred-on"
          required
          value={occurredOn}
          onChange={({ value }) => setOccurredOn(value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">数量（発）</Label>
        <Input
          id="quantity"
          type="number"
          min={0}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          許可失効は残数を記録用に入力できます。計算上は0にリセットされます。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">メモ</Label>
        <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "追加中…" : "イベントを追加"}
      </Button>
    </form>
  );
}
