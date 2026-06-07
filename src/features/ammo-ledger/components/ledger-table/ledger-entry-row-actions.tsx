"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { VoidLedgerEntryButton } from "@/features/ammo-ledger/components/ledger-table/void-ledger-entry-button";
import { cn } from "@/lib/cn";

type LedgerEntryRowActionsProps = {
  ledgerEntryId: string;
  editHref: string;
  onVoided?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
  onVoidFailed?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
};

export function LedgerEntryRowActions({
  ledgerEntryId,
  editHref,
  onVoided,
  onVoidFailed,
}: LedgerEntryRowActionsProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Link
          href={editHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 px-2 text-xs")}
        >
          編集
        </Link>
        <VoidLedgerEntryButton
          ledgerEntryId={ledgerEntryId}
          onVoided={onVoided}
          onVoidFailed={onVoidFailed}
        />
      </div>
    </div>
  );
}
