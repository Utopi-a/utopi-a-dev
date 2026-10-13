"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  buildLoginHrefForCurrentPage,
  buildRestoreHref,
  usePendingLedgerChanges,
  useSavingLedgerChangeCount,
} from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { cn } from "@/lib/cn";

/** 帳簿へ先行表示したあと保存できなかった記録を、入力に戻せるよう画面上部に残す。 */
export function PendingLedgerChangeAlerts() {
  const searchParams = useSearchParams();
  const { changes, remove } = usePendingLedgerChanges();
  const savingCount = useSavingLedgerChangeCount();
  const restoringId = searchParams.get("restore");
  const failedChanges = changes.filter(
    (change) => change.status === "failed" && change.restore && change.id !== restoringId,
  );

  if (failedChanges.length === 0 && savingCount === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* 取消・並び替えは行に「保存中」が出ないため、保存待ちの有無をここで常に知らせる。 */}
      {savingCount > 0 ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm"
        >
          <span
            aria-hidden
            className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          />
          帳簿への保存を待っている変更が{savingCount}
          件あります。保存が終わるまで印刷と帳簿の確定はできません。
        </p>
      ) : null}
      {failedChanges.map((change) => (
        <div
          key={change.id}
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-destructive">
            {change.failureTitle ?? `${change.summary}を保存できませんでした`}
          </p>
          {change.error ? <p className="text-muted-foreground">{change.error}</p> : null}
          {change.requiresLogin ? (
            <p className="text-muted-foreground">
              入力内容はこのタブに残っています。別のタブでログインしたあと、このタブの「入力に戻る」から保存し直してください。
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {/* このタブでログイン画面へ移ると帳簿の画面ごと消えて入力も失われるため、別のタブで開く。 */}
            {change.requiresLogin ? (
              <a
                href={buildLoginHrefForCurrentPage()}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "sm" }), "h-9")}
              >
                別のタブでログインする
              </a>
            ) : null}
            {change.restore ? (
              <Link
                href={buildRestoreHref({ href: change.restore.href, changeId: change.id })}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    variant: change.requiresLogin ? "outline" : "default",
                  }),
                  "h-9",
                )}
              >
                入力に戻る
              </Link>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => remove({ id: change.id })}
            >
              破棄する
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
