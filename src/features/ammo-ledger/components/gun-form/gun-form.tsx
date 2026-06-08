"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { createGunAction } from "@/features/ammo-ledger/master/create-gun/create-gun-action";
import { updateGunAction } from "@/features/ammo-ledger/master/update-gun/update-gun-action";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type GunFormProps = {
  recordId?: string;
  initialValues?: {
    name: string;
    gunNumber: string;
    permitNumber: string;
    gunType: string;
    caliber: string;
    purpose?: string | null;
    memo?: string | null;
  };
};

export function GunForm({ recordId, initialValues }: GunFormProps = {}) {
  const router = useRouter();
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const isEdit = Boolean(recordId);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [gunNumber, setGunNumber] = useState(initialValues?.gunNumber ?? "");
  const [permitNumber, setPermitNumber] = useState(initialValues?.permitNumber ?? "");
  const [gunType, setGunType] = useState(initialValues?.gunType ?? "散弾銃");
  const [caliber, setCaliber] = useState(initialValues?.caliber ?? "12番");
  const [purpose, setPurpose] = useState(initialValues?.purpose ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const payload = {
      name,
      gunNumber,
      permitNumber,
      gunType,
      caliber,
      purpose: purpose || undefined,
      memo: memo || undefined,
    };

    const result = isEdit
      ? await updateGunAction({ id: recordId!, input: payload })
      : await createGunAction(payload);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({
      action: isEdit ? "updated" : "created",
      subject: "銃",
    });
    await invalidateWorkspace();

    if (isEdit) {
      router.push("/lab/ammo-ledger/settings/guns");
      return;
    }

    router.refresh();
    setName("");
    setGunNumber("");
    setPermitNumber("");
    setPurpose("");
    setMemo("");
    setIsPending(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="gun-name">名称</Label>
        <Input id="gun-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gun-number">銃番号</Label>
        <Input
          id="gun-number"
          required
          value={gunNumber}
          onChange={(e) => setGunNumber(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="permit-number">許可番号</Label>
        <Input
          id="permit-number"
          required
          value={permitNumber}
          onChange={(e) => setPermitNumber(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gun-type">銃種</Label>
        <Input
          id="gun-type"
          required
          value={gunType}
          onChange={(e) => setGunType(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="caliber">番径</Label>
        <Input id="caliber" required value={caliber} onChange={(e) => setCaliber(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="purpose">用途</Label>
        <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="memo">メモ</Label>
        <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : isEdit ? "変更を保存" : "銃を追加"}
      </Button>
    </form>
  );
}
