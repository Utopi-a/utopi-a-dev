"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCounterpartyAction } from "@/features/ammo-ledger/master/create-counterparty/create-counterparty-action";
import { updateCounterpartyAction } from "@/features/ammo-ledger/master/update-counterparty/update-counterparty-action";

type CounterpartyFormProps = {
  recordId?: string;
  initialValues?: {
    name: string;
    address: string;
    memo?: string | null;
  };
};

export function CounterpartyForm({ recordId, initialValues }: CounterpartyFormProps = {}) {
  const router = useRouter();
  const isEdit = Boolean(recordId);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
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
      kind: "shop" as const,
      memo: memo || undefined,
    };

    const result = isEdit
      ? await updateCounterpartyAction({ id: recordId!, input: payload })
      : await createCounterpartyAction(payload);

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    if (isEdit) {
      router.push("/lab/ammo-ledger/settings/counterparties");
      return;
    }

    router.refresh();
    setName("");
    setAddress("");
    setMemo("");
    setIsPending(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="counterparty-name">店名・氏名</Label>
        <Input
          id="counterparty-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="counterparty-address">住所</Label>
        <Input
          id="counterparty-address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="counterparty-memo">メモ</Label>
        <Input id="counterparty-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : isEdit ? "変更を保存" : "購入先を追加"}
      </Button>
    </form>
  );
}
