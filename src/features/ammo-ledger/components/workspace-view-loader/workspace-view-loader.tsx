"use client";

import { Button } from "@/components/ui/button";

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
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            再試行
          </Button>
        ) : null}
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
