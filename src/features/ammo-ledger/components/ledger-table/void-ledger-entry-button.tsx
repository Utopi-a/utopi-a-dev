"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { voidLedgerEntryAction } from "@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type VoidLedgerEntryButtonProps = {
  ledgerEntryId: string;
  onVoided?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
  onVoidFailed?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
};

export function VoidLedgerEntryButton({
  ledgerEntryId,
  onVoided,
  onVoidFailed,
}: VoidLedgerEntryButtonProps) {
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    if (!window.confirm("この帳簿行を取り消しますか？削除ではなく取消履歴が残ります。")) {
      return;
    }

    setIsPending(true);
    setError(null);
    onVoided?.({ ledgerEntryId });

    const result = await voidLedgerEntryAction({ ledgerEntryId });

    if (!result.ok) {
      onVoidFailed?.({ ledgerEntryId });
      setError(result.error);
      setIsPending(false);
      return;
    }

    await invalidateWorkspace();
    setIsPending(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        disabled={isPending}
        onClick={handleVoid}
      >
        {isPending ? "取消中…" : "取消"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
