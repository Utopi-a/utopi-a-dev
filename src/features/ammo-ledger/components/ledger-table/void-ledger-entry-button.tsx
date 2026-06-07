"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { voidLedgerEntryAction } from "@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action";

type VoidLedgerEntryButtonProps = {
  ledgerEntryId: string;
};

export function VoidLedgerEntryButton({ ledgerEntryId }: VoidLedgerEntryButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    if (!window.confirm("この帳簿行を取り消しますか？削除ではなく取消履歴が残ります。")) {
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await voidLedgerEntryAction({ ledgerEntryId });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.refresh();
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
