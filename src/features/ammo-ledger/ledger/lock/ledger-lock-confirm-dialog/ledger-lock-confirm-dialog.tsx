"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerLockConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: ReactNode;
  lockedThrough: string;
  confirmLabel: string;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
};

export function LedgerLockConfirmDialog({
  open,
  onOpenChange,
  title,
  summary,
  lockedThrough,
  confirmLabel,
  isPending,
  error,
  onConfirm,
}: LedgerLockConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        {/* 閉じるとこの中身ごと破棄され、次に開いたときは確認のチェックが外れた状態から始まる。 */}
        <LedgerLockConfirmBody
          lockedThrough={lockedThrough}
          confirmLabel={confirmLabel}
          isPending={isPending}
          error={error}
          onCancel={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function LedgerLockConfirmBody({
  lockedThrough,
  confirmLabel,
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  lockedThrough: string;
  confirmLabel: string;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <>
      <div className="space-y-3 text-sm">
        <p>
          確定すると、{formatIsoDateForDisplay({ value: lockedThrough })}
          までの記録の追加・編集・取消・並べ替えができなくなります。
        </p>
        <p className="text-muted-foreground">
          解除が必要になったときは、設定の「帳簿の確定・ロック」から理由を記入して解除できます。解除した記録は履歴に残ります。
        </p>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5"
          />
          <span>上記を理解し、確定します</span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="button" onClick={onConfirm} disabled={!confirmed || isPending}>
          {isPending ? "確定中…" : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
