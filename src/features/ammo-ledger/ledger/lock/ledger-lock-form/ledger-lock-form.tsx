"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ammoLedgerLockEvent } from "@/db/schema/ammo-ledger";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { lockLedgerAction } from "@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import { unlockLedgerAction } from "@/features/ammo-ledger/ledger/lock/unlock-ledger-action/unlock-ledger-action";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type LockEvent = typeof ammoLedgerLockEvent.$inferSelect;

type LedgerLockFormProps = {
  lockState: LedgerLockState;
  events: LockEvent[];
};

export function LedgerLockForm({ lockState, events }: LedgerLockFormProps) {
  return (
    <div className="space-y-8">
      <LockStatusSection lockState={lockState} />
      <LockSection lockState={lockState} />
      {lockState.isLocked && lockState.lockedThrough ? (
        <UnlockSection lockedThrough={lockState.lockedThrough} />
      ) : null}
      {events.length > 0 ? <LockEventHistory events={events} /> : null}
    </div>
  );
}

function LockStatusSection({ lockState }: { lockState: LedgerLockState }) {
  if (!lockState.isLocked) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <p className="text-sm font-medium">ロック状態: 未ロック</p>
        <p className="mt-1 text-xs text-muted-foreground">すべての日付の帳簿を変更できます。</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
      <p className="text-sm font-medium">
        ロック状態: {formatIsoDateForDisplay({ value: lockState.lockedThrough ?? "" })}{" "}
        までロック済み
      </p>
      <p className="mt-1 text-xs text-muted-foreground">この日以前の帳簿は変更できません。</p>
    </div>
  );
}

function LockSection({ lockState }: { lockState: LedgerLockState }) {
  const router = useRouter();
  const today = getTokyoIsoDate();
  const minDate =
    lockState.isLocked && lockState.lockedThrough
      ? incrementDate({ date: lockState.lockedThrough })
      : undefined;

  const [lockedThrough, setLockedThrough] = useState(minDate ?? today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await lockLedgerAction({ lockedThrough });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "saved", subject: "帳簿ロック" });
    router.refresh();
    setIsPending(false);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">
          {lockState.isLocked ? "ロック期間を延長" : "帳簿をロック"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          指定した日付以前の帳簿を変更不可にします。ロックは延長のみ可能です。
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="lock-date">ロック対象日（この日まで）</Label>
          <div className="max-w-xs">
            <IsoDateInput
              id="lock-date"
              required
              value={lockedThrough}
              onChange={({ value }) => setLockedThrough(value)}
              min={minDate}
              max={today}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "ロック中…" : "ロックする"}
        </Button>
      </form>
    </section>
  );
}

function UnlockSection({ lockedThrough }: { lockedThrough: string }) {
  const router = useRouter();
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockDate, setUnlockDate] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleOpenDialog() {
    setUnlockDate("");
    setConfirmationText("");
    setReason("");
    setError(null);
    setUnlockDialogOpen(true);
  }

  async function handleUnlock() {
    setIsPending(true);
    setError(null);

    const result = await unlockLedgerAction({
      lockedThrough: unlockDate,
      confirmationText,
      reason,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    setUnlockDialogOpen(false);
    showAmmoLedgerToast({ action: "saved", subject: "帳簿ロック解除" });
    router.refresh();
    setIsPending(false);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-destructive">ロックを解除</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ロックを解除すると、すべての日付の帳簿が再び変更可能になります。この操作は慎重に行ってください。
        </p>
      </div>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">
          現在 {formatIsoDateForDisplay({ value: lockedThrough })} までロックされています。
          解除すると確定済みの帳簿が編集可能になります。
        </p>
        <Button type="button" variant="destructive" className="mt-3" onClick={handleOpenDialog}>
          ロックを解除する…
        </Button>
      </div>

      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>帳簿ロックの解除</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。解除するには以下をすべて入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-date">
                ロック対象日を再入力（{formatIsoDateForDisplay({ value: lockedThrough })}）
              </Label>
              <div className="max-w-xs">
                <IsoDateInput
                  id="unlock-date"
                  required
                  value={unlockDate}
                  onChange={({ value }) => setUnlockDate(value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-confirmation">
                確認文を入力:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  帳簿のロックを解除する
                </code>
              </Label>
              <Input
                id="unlock-confirmation"
                required
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="帳簿のロックを解除する"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-reason">理由（10〜500文字）</Label>
              <Textarea
                id="unlock-reason"
                required
                minLength={10}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="解除する理由を入力してください"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUnlockDialogOpen(false)}>
              キャンセル
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={handleUnlock}>
              {isPending ? "解除中…" : "解除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LockEventHistory({ events }: { events: LockEvent[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">ロック履歴</h2>
      <div className="divide-y divide-border/50 rounded-lg border border-border/60">
        {events.map((event) => (
          <div key={event.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={
                  event.eventKind === "lock"
                    ? "inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    : "inline-flex items-center rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive"
                }
              >
                {event.eventKind === "lock" ? "ロック" : "解除"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatIsoDateForDisplay({ value: event.lockedThrough })} まで
              </span>
            </div>
            {event.reason ? <p className="text-xs text-muted-foreground">{event.reason}</p> : null}
            <p className="text-xs text-muted-foreground/60">
              {event.createdAt.toLocaleString("ja-JP")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function incrementDate({ date }: { date: string }): string {
  const [year, month, day] = date.split("-").map(Number);
  return getTokyoIsoDate({
    now: new Date(Date.UTC(year, month - 1, day + 1)),
  });
}
