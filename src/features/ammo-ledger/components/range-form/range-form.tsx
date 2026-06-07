"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRangeAction } from "@/features/ammo-ledger/master/create-range/create-range-action";
import { updateRangeAction } from "@/features/ammo-ledger/master/update-range/update-range-action";

type RangeFormProps = {
  recordId?: string;
  initialValues?: {
    name: string;
    address: string;
    defaultPurpose?: string | null;
    memo?: string | null;
  };
};

export function RangeForm({ recordId, initialValues }: RangeFormProps = {}) {
  const router = useRouter();
  const isEdit = Boolean(recordId);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [defaultPurpose, setDefaultPurpose] = useState(initialValues?.defaultPurpose ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const payload = {
      name,
      address,
      defaultPurpose: defaultPurpose || undefined,
      memo: memo || undefined,
    };

    const result = isEdit
      ? await updateRangeAction({ id: recordId!, input: payload })
      : await createRangeAction(payload);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    if (isEdit) {
      router.push("/lab/ammo-ledger/settings/ranges");
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
        {isPending ? "保存中…" : isEdit ? "変更を保存" : "射撃場を追加"}
      </Button>
    </form>
  );
}
