"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { checkLedgerChangesAgainstStock } from "@/features/ammo-ledger/transactions/check-ledger-changes-against-stock/check-ledger-changes-against-stock";
import { voidLedgerEntryAction } from "@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action";
import type { LedgerEntryRow } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";
import { useRunPendingLedgerChange } from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type VoidLedgerEntryButtonProps = {
  entry: Pick<LedgerEntryRow, "id" | "occurredOn" | "ammoTypeName" | "quantity">;
  /** 取消を受け付けた時点で呼ぶ（シートを閉じるなど） */
  onVoidStarted?: () => void;
};

export function VoidLedgerEntryButton({ entry, onVoidStarted }: VoidLedgerEntryButtonProps) {
  const { workspace } = useAmmoLedgerWorkspace();
  const runPendingChange = useRunPendingLedgerChange();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleVoid() {
    setError(null);
    const changes = { upserted: [], removedIds: [entry.id] };
    if (workspace) {
      const stockCheck = checkLedgerChangesAgainstStock({ entries: workspace.entries, changes });
      if (!stockCheck.ok) {
        setError(`取り消すと${stockCheck.error}`);
        return;
      }
    }

    const summary = `${formatIsoDateForDisplay({ value: entry.occurredOn })} ${entry.ammoTypeName} ${entry.quantity}発`;
    runPendingChange({
      overlay: changes,
      summary,
      failureTitle: `記録を取消できませんでした（${summary}）`,
      successMessage: "帳簿行を取消しました",
      action: async () => {
        const result = await voidLedgerEntryAction({ ledgerEntryId: entry.id });
        return result.ok ? { ok: true, changes } : result;
      },
    });
    onVoidStarted?.();
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full text-sm text-destructive hover:text-destructive"
        onClick={() => setIsConfirming(true)}
      >
        取消
      </Button>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <legend className="sr-only">取消の確認</legend>
      <p className="text-sm">この記録を取り消しますか？削除ではなく、取消の履歴が残ります。</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={() => {
            setIsConfirming(false);
            setError(null);
          }}
        >
          やめる
        </Button>
        <Button type="button" variant="destructive" className="h-11" onClick={handleVoid}>
          取り消す
        </Button>
      </div>
    </fieldset>
  );
}
