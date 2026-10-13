"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvalidateMasterPickerData } from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { createRangeAction } from "@/features/ammo-ledger/master/create-range/create-range-action";
import { updateRangeAction } from "@/features/ammo-ledger/master/update-range/update-range-action";

type RangeFormProps = {
  recordId?: string;
  initialValues?: {
    name: string;
    address: string;
    memo?: string | null;
  };
};

export function RangeForm({ recordId, initialValues }: RangeFormProps = {}) {
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
        // 指定区分（defaultPurpose）は全国一覧から追加したときの参考値で、どこからも読まないため
        // 入力欄を置かない。送らなければ更新でも既存の値は消えない。
        memo: memo || undefined,
      };

      const result = recordId
        ? await updateRangeAction({ id: recordId, input: payload })
        : await createRangeAction(payload);

      if (!result.ok) {
        setError(result.error);

        return;
      }

      showAmmoLedgerToast({
        action: isEdit ? "updated" : "created",
        subject: "射撃場",
      });
      invalidatePickerData();

      if (isEdit) {
        router.push("/lab/ammo-ledger/settings/ranges");
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
        <Label htmlFor="range-name">射撃場名</Label>
        <Input id="range-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">所在地</Label>
        <Input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="memo">メモ</Label>
        <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
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
              : "射撃場を追加"}
      </Button>
    </form>
  );
}
