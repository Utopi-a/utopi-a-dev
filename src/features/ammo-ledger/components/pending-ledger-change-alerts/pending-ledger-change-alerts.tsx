"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  buildRestoreHref,
  usePendingLedgerChanges,
} from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { cn } from "@/lib/cn";

/** 帳簿へ先行表示したあと保存できなかった記録を、入力に戻せるよう画面上部に残す。 */
export function PendingLedgerChangeAlerts() {
  const searchParams = useSearchParams();
  const { changes, remove } = usePendingLedgerChanges();
  const restoringId = searchParams.get("restore");
  const failedChanges = changes.filter(
    (change) => change.status === "failed" && change.restore && change.id !== restoringId,
  );

  if (failedChanges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {failedChanges.map((change) => (
        <div
          key={change.id}
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-destructive">{change.summary}を保存できませんでした</p>
          {change.error ? <p className="text-muted-foreground">{change.error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {change.restore ? (
              <Link
                href={buildRestoreHref({ href: change.restore.href, changeId: change.id })}
                className={cn(buttonVariants({ size: "sm" }), "h-9")}
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
