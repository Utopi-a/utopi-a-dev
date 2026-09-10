"use client";

import { Button } from "@/components/ui/button";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type AmmoLedgerRefreshIndicatorProps = {
  visible: boolean;
};

export function AmmoLedgerRefreshIndicator({ visible }: AmmoLedgerRefreshIndicatorProps) {
  const { error, retry } = useAmmoLedgerWorkspace();
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-center gap-2 py-3 text-sm">
        <p>帳簿の表示を更新できませんでした。</p>
        <Button type="button" variant="outline" onClick={retry}>
          再試行
        </Button>
      </div>
    );
  }
  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-t border-border/50 py-3 text-sm text-muted-foreground"
    >
      <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      更新中…
    </div>
  );
}
