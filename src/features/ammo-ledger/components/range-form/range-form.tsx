"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRangeAction } from "@/features/ammo-ledger/master/create-range/create-range-action";

export function RangeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [defaultPurpose, setDefaultPurpose] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createRangeAction({
      name,
      address,
      defaultPurpose: defaultPurpose || undefined,
      memo: memo || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.refresh();
    setName("");
    setAddress("");
    setDefaultPurpose("");
    setMemo("");
    setIsPending(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="range-name">射撃場名</Label>
        <Input id="range-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">所在地</Label>
        <Input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="default-purpose">よく使う用途</Label>
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "追加中…" : "射撃場を追加"}
      </Button>
    </form>
  );
}
