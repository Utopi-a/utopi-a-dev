"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { reorderLedgerEntryAction } from "@/features/ammo-ledger/transactions/reorder-ledger-entry/reorder-ledger-entry-action";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { cn } from "@/lib/cn";

type LedgerEntryReorderButtonsProps = {
  ledgerEntryId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onReordered?: () => void;
  className?: string;
};

export function LedgerEntryReorderButtons({
  ledgerEntryId,
  canMoveUp,
  canMoveDown,
  onReordered,
  className,
}: LedgerEntryReorderButtonsProps) {
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const [pendingDirection, setPendingDirection] = useState<"up" | "down" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReorder({ direction }: { direction: "up" | "down" }) {
    setPendingDirection(direction);
    setError(null);

    const result = await reorderLedgerEntryAction({ ledgerEntryId, direction });

    if (!result.ok) {
      setError(result.error);
      setPendingDirection(null);
      return;
    }

    showAmmoLedgerToast({ action: "updated", subject: "並び順" });
    await invalidateWorkspace();
    onReordered?.();
    setPendingDirection(null);
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
          disabled={!canMoveUp || pendingDirection !== null}
          onClick={() => handleReorder({ direction: "up" })}
        >
          <ChevronUp className="size-4" />
          上へ
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={!canMoveDown || pendingDirection !== null}
          onClick={() => handleReorder({ direction: "down" })}
        >
          <ChevronDown className="size-4" />
          下へ
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">同日の記録どうしの順番を入れ替えます。</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
