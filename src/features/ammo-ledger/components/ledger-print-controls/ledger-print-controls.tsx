"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LedgerYearSelect } from "@/features/ammo-ledger/components/ledger-year-select/ledger-year-select";
import type { LedgerLockIssue } from "@/features/ammo-ledger/documents/validate-ledger-for-lock/validate-ledger-for-lock";
import { lockLedgerAction } from "@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerPrintControlsProps = {
  years: number[];
  selectedYear: number;
  backHref?: string;
  lockedThrough?: string | null;
  isTargetLocked: boolean;
  canPrintOfficially: boolean;
  isPreview: boolean;
  targetDate: string;
  entryCount: number;
  lockIssues: LedgerLockIssue[];
};

export function LedgerPrintControls({
  years,
  selectedYear,
  backHref = "/lab/ammo-ledger/ledger",
  lockedThrough,
  isTargetLocked,
  canPrintOfficially,
  isPreview,
  targetDate,
  entryCount,
  lockIssues,
}: LedgerPrintControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsLock = !isTargetLocked;
  const needsExtension = !isTargetLocked && lockedThrough != null && lockedThrough < targetDate;
  const hasBlockingIssues = lockIssues.length > 0;

  useEffect(() => {
    if (canPrintOfficially && searchParams.get("print") === "1") {
      window.print();
    }
  }, [canPrintOfficially, searchParams]);

  function handleYearChange({ year }: { year: number }) {
    const previewParam = isPreview ? "&preview=1" : "";
    router.push(`/lab/ammo-ledger/ledger/print?year=${year}${previewParam}`);
  }

  function handleLockAndPrint() {
    setError(null);
    startTransition(async () => {
      const result = await lockLedgerAction({ lockedThrough: targetDate });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialogOpen(false);
      setConfirmed(false);
      router.push(`/lab/ammo-ledger/ledger/print?year=${selectedYear}&print=1`);
      router.refresh();
    });
  }

  const lockButtonLabel = needsExtension
    ? `${formatIsoDateForDisplay({ value: targetDate })}まで延長して印刷`
    : `${formatIsoDateForDisplay({ value: targetDate })}まで確定して印刷`;

  return (
    <div className="no-print space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← 帳簿に戻る
        </Link>
        {canPrintOfficially && !hasBlockingIssues ? (
          <Button type="button" size="sm" onClick={() => window.print()}>
            印刷
          </Button>
        ) : null}
        {needsLock ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={hasBlockingIssues}
          >
            {lockButtonLabel}
          </Button>
        ) : null}
        {!canPrintOfficially && !isPreview ? (
          <Link
            href={`/lab/ammo-ledger/ledger/print?year=${selectedYear}&preview=1`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            未確定プレビュー
          </Link>
        ) : null}
        {isPreview ? (
          <Link
            href={`/lab/ammo-ledger/ledger/print?year=${selectedYear}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            正式印刷へ戻る
          </Link>
        ) : null}
      </div>

      <div className="max-w-xs">
        <LedgerYearSelect
          years={years}
          value={selectedYear}
          onChange={handleYearChange}
          label="印刷する年"
        />
        {isPreview ? (
          <p className="mt-1 text-xs font-medium text-amber-700">
            ロック前の未確定プレビューです。正式な提出用帳簿ではありません。
          </p>
        ) : null}
        {lockedThrough ? (
          <p className="mt-1 text-xs text-muted-foreground">
            ロック済み: {formatIsoDateForDisplay({ value: lockedThrough })} まで
          </p>
        ) : null}
      </div>

      {hasBlockingIssues ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">
            {isTargetLocked
              ? "ロックを解除し、以下の問題を修正してから印刷してください"
              : "以下の問題を修正してから確定してください"}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-destructive/90">
            {lockIssues.map((issue) => (
              <li key={`${issue.entryId}-${issue.message}`}>
                {formatIsoDateForDisplay({ value: issue.occurredOn })}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>帳簿を確定して印刷</DialogTitle>
            <DialogDescription>
              {selectedYear}年の記録（{entryCount}件）を
              {formatIsoDateForDisplay({ value: targetDate })}
              まで確定します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p>
              確定後は、対象期間（{formatIsoDateForDisplay({ value: targetDate })}
              以前）の記録を編集できなくなります。
            </p>
            <p className="text-muted-foreground">
              解除が必要な場合は設定画面から理由を記入して行えます。
            </p>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>上記を理解し、確定します</span>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleLockAndPrint} disabled={!confirmed || isPending}>
              {isPending ? "確定中…" : "確定して印刷"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
