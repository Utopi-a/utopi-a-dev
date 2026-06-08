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
import { createAcquisitionPermitAction } from "@/features/ammo-ledger/permit/create-acquisition-permit/create-acquisition-permit-action";
import {
  type AcquisitionPermitName,
  acquisitionPermitNameOptions,
  defaultAcquisitionPermitName,
} from "@/features/ammo-ledger/schema/acquisition-permit-name-options";
import {
  type AcquisitionPermitPurpose,
  acquisitionPermitPurposeOptions,
  defaultAcquisitionPermitPurpose,
} from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

function defaultExpiresOn({ grantedOn }: { grantedOn: string }): string {
  const date = new Date(`${grantedOn}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function AcquisitionPermitForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [ledgerPurpose, setLedgerPurpose] = useState<LedgerPurpose>("shooting");
  const [name, setName] = useState(defaultAcquisitionPermitName);
  const [permitPurpose, setPermitPurpose] = useState(defaultAcquisitionPermitPurpose);
  const [grantedOn, setGrantedOn] = useState(today);
  const [expiresOn, setExpiresOn] = useState(defaultExpiresOn({ grantedOn: today }));
  const [quantity, setQuantity] = useState("5000");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleGrantedOnChange(value: string) {
    setGrantedOn(value);
    if (expiresOn < value) {
      setExpiresOn(defaultExpiresOn({ grantedOn: value }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createAcquisitionPermitAction({
      ledgerPurpose,
      name,
      permitPurpose,
      grantedOn,
      expiresOn,
      quantity: Number(quantity) || 0,
      memo: memo || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "created", subject: "譲受許可" });
    router.push(buildLedgerHref({ purpose: ledgerPurpose }));
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <PurposeSelect value={ledgerPurpose} onChange={setLedgerPurpose} />

      <FieldSelect
        id="permit-name"
        label="名称"
        value={name}
        onChange={(value) => setName(value as AcquisitionPermitName)}
        options={acquisitionPermitNameOptions.map((option) => ({
          value: option,
          label: option,
        }))}
        required
        placeholder=""
      />

      <FieldSelect
        id="permit-purpose"
        label="譲受の目的"
        value={permitPurpose}
        onChange={(value) => setPermitPurpose(value as AcquisitionPermitPurpose)}
        options={acquisitionPermitPurposeOptions.map((option) => ({
          value: option,
          label: option,
        }))}
        required
        placeholder=""
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="granted-on">付与日</Label>
          <IsoDateInput
            id="granted-on"
            required
            value={grantedOn}
            onChange={({ value }) => handleGrantedOnChange(value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expires-on">有効期限</Label>
          <IsoDateInput
            id="expires-on"
            required
            value={expiresOn}
            min={grantedOn}
            onChange={({ value }) => setExpiresOn(value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="permit-quantity">許可数量（発）</Label>
        <Input
          id="permit-quantity"
          type="number"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          1回の譲受許可で交付される数量です。帳簿の許可残数は譲受に応じて減ります。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="permit-memo">メモ</Label>
        <Input id="permit-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "登録中…" : "許可を登録"}
      </Button>
    </form>
  );
}
