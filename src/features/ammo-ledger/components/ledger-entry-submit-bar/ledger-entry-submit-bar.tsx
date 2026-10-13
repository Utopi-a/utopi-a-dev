"use client";

import { Button } from "@/components/ui/button";
import { LedgerEntryCheckNotice } from "@/features/ammo-ledger/components/ledger-entry-stock-preview/ledger-entry-stock-preview";
import type { LedgerEntryPreview } from "@/features/ammo-ledger/transactions/preview-ledger-entry/preview-ledger-entry";

/**
 * 記録フォームの保存ボタン。モバイルでは画面下に固定し、入力の途中でもすぐ保存できるようにする。
 * preview を渡すと、保存すると拒否される理由をボタンの上に常に示す。
 */
export function LedgerEntrySubmitBar({
  label,
  isPending,
  disabled,
  error,
  preview = null,
}: {
  label: string;
  isPending: boolean;
  disabled: boolean;
  error: string | null;
  preview?: LedgerEntryPreview | null;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 space-y-2 border-t border-border/60 bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <LedgerEntryCheckNotice preview={preview} />
      {/* 保存前の確認と同じ理由で拒否されたときは、同じ文を二重に出さない。 */}
      {error && error !== preview?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="h-12 w-full text-base sm:h-9 sm:w-auto sm:text-sm"
        disabled={isPending || disabled}
      >
        {isPending ? "保存中…" : label}
      </Button>
    </div>
  );
}
