"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { computeSwappedDayOrders } from "@/features/ammo-ledger/ledger/compute-swapped-day-orders/compute-swapped-day-orders";
import { checkLedgerChangesAgainstStock } from "@/features/ammo-ledger/transactions/check-ledger-changes-against-stock/check-ledger-changes-against-stock";
import { reorderLedgerEntryAction } from "@/features/ammo-ledger/transactions/reorder-ledger-entry/reorder-ledger-entry-action";
import { useRunPendingLedgerChange } from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import {
  useAmmoLedgerWorkspace,
  useRequestAmmoLedgerWorkspaceRevalidation,
} from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { cn } from "@/lib/cn";

type LedgerEntryReorderButtonsProps = {
  ledgerEntryId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  className?: string;
};

export function LedgerEntryReorderButtons({
  ledgerEntryId,
  canMoveUp,
  canMoveDown,
  className,
}: LedgerEntryReorderButtonsProps) {
  const { workspace, pendingEntryIds } = useAmmoLedgerWorkspace();
  const runPendingChange = useRunPendingLedgerChange();
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
  const [error, setError] = useState<string | null>(null);

  function handleReorder({ direction }: { direction: "up" | "down" }) {
    setError(null);
    const target = workspace?.entries.find((entry) => entry.id === ledgerEntryId);
    if (!workspace || !target) {
      setError("帳簿を読み込み中です。少し待ってから並び替えてください。");
      return;
    }

    // サーバーと同じく、同じ日・同じ用途の記録どうしで順番を入れ替える。
    const siblings = workspace.entries.filter(
      (entry) => entry.occurredOn === target.occurredOn && entry.purpose === target.purpose,
    );
    // 保存待ちの行はサーバーの並び順がまだ決まっていないため、同じ日の並び替えを待ってもらう。
    if (siblings.some((entry) => pendingEntryIds.has(entry.id))) {
      setError("同じ日に保存中の記録があります。保存が終わってから並び替えてください。");
      return;
    }
    const nextDayOrders = computeSwappedDayOrders({ entries: siblings, ledgerEntryId, direction });
    if (!nextDayOrders) {
      setError("この方向には移動できません");
      return;
    }

    const changes = {
      upserted: [],
      removedIds: [],
      dayOrders: [...nextDayOrders].map(([id, dayOrder]) => ({ id, dayOrder })),
    };
    const stockCheck = checkLedgerChangesAgainstStock({ entries: workspace.entries, changes });
    if (!stockCheck.ok) {
      setError(`この順番では${stockCheck.error}`);
      requestRevalidation();
      return;
    }

    runPendingChange({
      overlay: changes,
      marksEntriesSaving: false,
      summary: "並び順の変更",
      failureTitle: "並び順を変更できませんでした",
      unknownTitle: "並び順を変更できたか確認できませんでした",
      unknownDescription:
        "通信が途切れました。帳簿を取り直して、保存されている並び順を表示します。",
      action: async () => {
        const result = await reorderLedgerEntryAction({ ledgerEntryId, direction });
        // 確定時はサーバーが保存した並び順だけを反映し、画面上の行の内容は書き込まない。
        return result.ok
          ? { ok: true, changes: { upserted: [], removedIds: [], dayOrders: result.dayOrders } }
          : result;
      },
    });
  }

  if (!canMoveUp && !canMoveDown) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={!canMoveUp}
          onClick={() => handleReorder({ direction: "up" })}
        >
          <ChevronUp className="size-4" />
          上へ
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={!canMoveDown}
          onClick={() => handleReorder({ direction: "down" })}
        >
          <ChevronDown className="size-4" />
          下へ
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">同日の記録どうしの順番を入れ替えます。</p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
