"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInvalidateMasterPickerData } from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { useMasterListItem } from "@/features/ammo-ledger/components/master-list-item/master-list-item";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { useRequestAmmoLedgerWorkspaceRevalidation } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { cn } from "@/lib/cn";

export type MasterDeleteResult = { ok: true } | { ok: false; error?: string };

type MasterRowActionsProps = {
  editHref?: string;
  recordId: string;
  deletedSubject: string;
  /** 削除で帳簿に起きることを確認ダイアログで伝える */
  deleteNote?: string;
  deleteAction: (args: { id: string }) => Promise<MasterDeleteResult>;
};

export function MasterRowActions({
  editHref,
  recordId,
  deletedSubject,
  deleteNote = "帳簿の過去の記録は残ります。",
  deleteAction,
}: MasterRowActionsProps) {
  const router = useRouter();
  const listItem = useMasterListItem();
  const requestWorkspaceRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
  const invalidatePickerData = useInvalidateMasterPickerData();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDeleteFailed({ message }: { message: string }) {
    listItem?.setHidden(false);
    setError(message);
    toast.error(`${deletedSubject}を削除できませんでした`, { description: message });
  }

  async function handleDelete() {
    setIsConfirmOpen(false);
    setIsDeleting(true);
    setError(null);
    // 一覧の再描画を待たずに行を隠し、失敗したら戻す。
    listItem?.setHidden(true);
    try {
      const result = await deleteAction({ id: recordId });
      if (!result.ok) {
        handleDeleteFailed({ message: result.error ?? "削除に失敗しました" });
        return;
      }

      showAmmoLedgerToast({ action: "deleted", subject: deletedSubject });
      requestWorkspaceRevalidation();
      invalidatePickerData();
      startRefresh(() => router.refresh());
    } catch {
      handleDeleteFailed({
        message: "削除結果を確認できませんでした。時間をおいて再度お試しください。",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {editHref ? (
          <Link href={editHref} className={cn(buttonVariants({ variant: "outline" }), "h-9")}>
            編集
          </Link>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="h-9 text-destructive hover:text-destructive"
          disabled={isDeleting}
          onClick={() => setIsConfirmOpen(true)}
        >
          削除
        </Button>
      </div>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{deletedSubject}を削除しますか？</DialogTitle>
            <DialogDescription>{deleteNote}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsConfirmOpen(false)}>
              やめる
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
