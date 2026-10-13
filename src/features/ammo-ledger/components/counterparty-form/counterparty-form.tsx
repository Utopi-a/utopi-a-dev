"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvalidateMasterPickerData } from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
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
  const invalidatePickerData = useInvalidateMasterPickerData();
  const isEdit = Boolean(recordId);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  // 追加した行が一覧に出るまで処理中にし、反映前の二重登録を防ぐ。
  const [isRefreshingList, startListRefresh] = useTransition();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const payload = {
        name,
        address,
        kind: "shop" as const,
        memo: memo || undefined,
      };

      const result = recordId
        ? await updateCounterpartyAction({ id: recordId, input: payload })
        : await createCounterpartyAction(payload);

      if (!result.ok) {
        setError(result.error);

        return;
      }

      showAmmoLedgerToast({
        action: isEdit ? "updated" : "created",
        subject: "購入先",
      });
      invalidatePickerData();

      if (isEdit) {
        router.push("/lab/ammo-ledger/settings/counterparties");
        return;
      }

      startListRefresh(() => router.refresh());
      setName("");
      setAddress("");
      setMemo("");
    } catch {
      setError("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。");
    } finally {
      setIsPending(false);
    }
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
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending || isRefreshingList}>
        {isPending
          ? "保存中…"
          : isRefreshingList
            ? "一覧を更新中…"
            : isEdit
              ? "変更を保存"
              : "購入先を追加"}
      </Button>
    </form>
  );
}
