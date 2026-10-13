"use client";

import { Button } from "@/components/ui/button";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

/** 帳簿の再取得中であることを上部ナビの直下に重ねて示す。本文を押し下げないよう重ねて出す。 */
export function AmmoLedgerRefreshStatus() {
  const { isRefreshing } = useAmmoLedgerWorkspace({ revalidateOnMount: false });

  return (
    <div role="status" aria-live="polite">
      {isRefreshing ? (
        <p className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <span
            aria-hidden
            className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
          />
          帳簿を更新中…
        </p>
      ) : null}
    </div>
  );
}

/** 表示済みの帳簿を取り直せなかったことを、画面上部で再試行とともに知らせる。 */
export function AmmoLedgerRefreshError() {
  const { workspace, error, retry } = useAmmoLedgerWorkspace({ revalidateOnMount: false });
  // 一度も取得できていないときは各画面のローダーが失敗を表示する。
  if (!error || !workspace) {
    return null;
  }

  return (
    <div
      role="alert"
      className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
    >
      <p className="font-medium text-destructive">帳簿の表示を更新できませんでした</p>
      <p className="text-muted-foreground">表示中の内容は最新でない可能性があります。</p>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={retry}>
        再試行
      </Button>
    </div>
  );
}
