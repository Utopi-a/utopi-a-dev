"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGunAction } from "@/features/ammo-ledger/master/create-gun/create-gun-action";

export function GunForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [gunType, setGunType] = useState("散弾銃");
  const [caliber, setCaliber] = useState("12番");
  const [purpose, setPurpose] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createGunAction({
      name,
      permitNumber,
      gunType,
      caliber,
      purpose: purpose || undefined,
      memo: memo || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.refresh();
    setName("");
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
        {isPending ? "追加中…" : "銃を追加"}
      </Button>
    </form>
  );
}
