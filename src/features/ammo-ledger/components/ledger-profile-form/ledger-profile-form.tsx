"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { upsertLedgerProfileAction } from "@/features/ammo-ledger/profile/upsert-ledger-profile/upsert-ledger-profile-action";

type LedgerProfileFormProps = {
  initialValues: {
    ownerName: string;
    ownerAddress?: string | null;
  };
  accountName: string;
};

export function LedgerProfileForm({ initialValues, accountName }: LedgerProfileFormProps) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState(initialValues.ownerName);
  const [ownerAddress, setOwnerAddress] = useState(initialValues.ownerAddress ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await upsertLedgerProfileAction({
      ownerName,
      ownerAddress: ownerAddress || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "saved", subject: "帳簿プロフィール" });
    router.refresh();
    setIsPending(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        帳簿の表紙・印刷に使う氏名です。未入力のときはアカウント名（{accountName}）が使われます。
      </p>

      <div className="space-y-2">
        <Label htmlFor="owner-name">帳簿用氏名</Label>
        <Input
          id="owner-name"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder={accountName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner-address">住所（任意）</Label>
        <Input
          id="owner-address"
          value={ownerAddress}
          onChange={(e) => setOwnerAddress(e.target.value)}
          placeholder="帳簿表紙に記載する場合のみ"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
