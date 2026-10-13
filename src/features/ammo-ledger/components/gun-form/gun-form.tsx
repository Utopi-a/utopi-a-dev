"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { createGunAction } from "@/features/ammo-ledger/master/create-gun/create-gun-action";
import { updateGunAction } from "@/features/ammo-ledger/master/update-gun/update-gun-action";
import { useRequestAmmoLedgerWorkspaceRevalidation } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

// 所持許可証の表記がほかにあれば自由に入力できるよう、選択肢ではなく入力候補にする。
const gunTypeSuggestions = ["散弾銃", "ライフル銃", "空気銃"];
const caliberSuggestions = ["12番", "20番", "410番"];

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
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
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
  // 追加した行が一覧に出るまで処理中にし、反映前の二重登録を防ぐ。
  const [isRefreshingList, startListRefresh] = useTransition();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const payload = {
        name,
        gunNumber,
        permitNumber,
        gunType,
        caliber,
        purpose: purpose || undefined,
        memo: memo || undefined,
      };

      const result = recordId
        ? await updateGunAction({ id: recordId, input: payload })
        : await createGunAction(payload);

      if (!result.ok) {
        setError(result.error);

        return;
      }

      showAmmoLedgerToast({
        action: isEdit ? "updated" : "created",
        subject: "銃",
      });
      requestRevalidation();

      if (isEdit) {
        router.push("/lab/ammo-ledger/settings/guns");
        return;
      }

      startListRefresh(() => router.refresh());
      setName("");
      setGunNumber("");
      setPermitNumber("");
      setPurpose("");
      setMemo("");
    } catch {
      setError("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        名称から用途までは、帳簿印刷の別紙1「使用銃の一覧」にそのまま載ります。所持許可証の記載に合わせて入力してください。
      </p>
      <div className="space-y-2">
        <Label htmlFor="gun-name">名称</Label>
        <Input
          id="gun-name"
          required
          placeholder="例: 上下二連（スキート用）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gun-number">銃番号</Label>
        <Input
          id="gun-number"
          required
          placeholder="例: A12345"
          value={gunNumber}
          onChange={(e) => setGunNumber(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="permit-number">許可番号</Label>
        <p id="permit-number-help" className="text-xs text-muted-foreground">
          所持許可証の「第」「号」を除いた番号だけを入力します（第12345号なら 12345）。
        </p>
        <Input
          id="permit-number"
          required
          placeholder="例: 12345"
          aria-describedby="permit-number-help"
          value={permitNumber}
          onChange={(e) => setPermitNumber(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gun-type">銃種</Label>
        <Input
          id="gun-type"
          required
          list="gun-type-suggestions"
          placeholder="例: 散弾銃"
          value={gunType}
          onChange={(e) => setGunType(e.target.value)}
        />
        <datalist id="gun-type-suggestions">
          {gunTypeSuggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
      <div className="space-y-2">
        <Label htmlFor="caliber">番径</Label>
        <p id="caliber-help" className="text-xs text-muted-foreground">
          散弾銃は番径（例: 12番）、ライフル銃は口径（例: .308WIN）を入力します。
        </p>
        <Input
          id="caliber"
          required
          list="gun-caliber-suggestions"
          aria-describedby="caliber-help"
          value={caliber}
          onChange={(e) => setCaliber(e.target.value)}
        />
        <datalist id="gun-caliber-suggestions">
          {caliberSuggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
      <div className="space-y-2">
        <Label htmlFor="purpose">用途</Label>
        <Input
          id="purpose"
          placeholder="例: 標的射撃、狩猟"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="memo">メモ（帳簿には出ません）</Label>
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
              : "銃を追加"}
      </Button>
    </form>
  );
}
