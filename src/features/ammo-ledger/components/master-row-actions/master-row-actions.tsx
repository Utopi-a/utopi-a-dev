"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type MasterRowActionsProps = {
  editHref: string;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
};

export function MasterRowActions({ editHref, onDelete }: MasterRowActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("削除しますか？帳簿の過去記録は残ります。")) {
      return;
    }
    setIsPending(true);
    setError(null);
    const result = await onDelete();
    if (!result.ok) {
      setError(result.error ?? "削除に失敗しました");
      setIsPending(false);
      return;
    }
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Link href={editHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          編集
        </Link>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
          削除
        </Button>
      </div>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
