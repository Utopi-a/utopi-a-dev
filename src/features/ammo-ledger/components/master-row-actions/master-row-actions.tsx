"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { cn } from "@/lib/cn";

export type MasterDeleteResult = { ok: true } | { ok: false; error?: string };

type MasterRowActionsProps = {
  editHref?: string;
  recordId: string;
  deletedSubject: string;
  deleteAction: (args: { id: string }) => Promise<MasterDeleteResult>;
};

export function MasterRowActions({
  editHref,
  recordId,
  deletedSubject,
  deleteAction,
}: MasterRowActionsProps) {
  const router = useRouter();
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("削除しますか？帳簿の過去記録は残ります。")) {
      return;
    }
    setIsPending(true);
    setError(null);
    const result = await deleteAction({ id: recordId });
    if (!result.ok) {
      setError(result.error ?? "削除に失敗しました");
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "deleted", subject: deletedSubject });
    await invalidateWorkspace();
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {editHref ? (
          <Link href={editHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            編集
          </Link>
        ) : null}
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
          削除
        </Button>
      </div>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
