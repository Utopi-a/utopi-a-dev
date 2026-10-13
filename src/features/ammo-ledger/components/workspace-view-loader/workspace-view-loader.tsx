"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { AmmoLedgerLoginRequiredError } from "@/features/ammo-ledger/workspace/fetch-ammo-ledger-workspace/fetch-ammo-ledger-workspace";

type WorkspaceErrorActionProps = {
  error: unknown;
  onRetry?: () => void;
};

/** 取得に失敗したときの復旧手段。ログイン切れは再試行しても直らないため、ログイン画面へ案内する。 */
export function WorkspaceErrorAction({ error, onRetry }: WorkspaceErrorActionProps) {
  const pathname = usePathname();

  if (error instanceof AmmoLedgerLoginRequiredError) {
    return (
      <Link
        href={`/login?${new URLSearchParams({ next: pathname })}`}
        className={buttonVariants({ variant: "outline" })}
      >
        ログイン画面へ
      </Link>
    );
  }
  if (!onRetry) {
    return null;
  }
  return (
    <Button type="button" variant="outline" onClick={onRetry}>
      再試行
    </Button>
  );
}

type WorkspaceViewLoaderProps = {
  label?: string;
  error?: unknown;
  onRetry?: () => void;
};

export function WorkspaceViewLoader({
  label = "読み込み中…",
  error,
  onRetry,
}: WorkspaceViewLoaderProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm"
      >
        <p>{error instanceof Error ? error.message : "データを取得できませんでした。"}</p>
        <WorkspaceErrorAction error={error} onRetry={onRetry} />
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {label}
    </div>
  );
}
