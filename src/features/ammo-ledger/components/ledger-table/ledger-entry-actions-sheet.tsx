"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildLedgerEntryEditHref,
  isAmmoCarryoverEntry,
  isLedgerEntryEditable,
  LedgerCategoryBadge,
  PermitCarryoverBadge,
} from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import { LedgerEntryReorderButtons } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-reorder-buttons";
import { VoidLedgerEntryButton } from "@/features/ammo-ledger/components/ledger-table/void-ledger-entry-button";
import {
  buildPermitCarryoverLabel,
  type LedgerDisplayRow,
} from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import { formatPermitBalance } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { resolveLedgerEntryReorderState } from "@/features/ammo-ledger/ledger/resolve-ledger-entry-reorder-state/resolve-ledger-entry-reorder-state";
import { buildOpeningBalanceHref } from "@/features/ammo-ledger/opening-balance/build-opening-balance-href/build-opening-balance-href";
import { formatPermitExpiryLabel } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import {
  type LedgerCategory,
  ledgerCategoryLabels,
} from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type LedgerEntryActionsSheetProps = {
  row: LedgerDisplayRow | null;
  rows: LedgerDisplayRow[];
  purpose: LedgerPurpose;
  permitBalance?: number;
  open: boolean;
  onOpenChange: ({ open }: { open: boolean }) => void;
  onVoided?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
  onVoidFailed?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
};

export function LedgerEntryActionsSheet({
  row,
  rows,
  purpose,
  permitBalance,
  open,
  onOpenChange,
  onVoided,
  onVoidFailed,
}: LedgerEntryActionsSheetProps) {
  if (!row) {
    return null;
  }

  function handleVoided({ ledgerEntryId }: { ledgerEntryId: string }) {
    onOpenChange({ open: false });
    onVoided?.({ ledgerEntryId });
  }

  function handleVoidFailed({ ledgerEntryId }: { ledgerEntryId: string }) {
    onVoidFailed?.({ ledgerEntryId });
  }

  if (row.kind === "permit_carryover") {
    const today = new Date().toISOString().slice(0, 10);
    const editHref = buildOpeningBalanceHref({
      occurredOn: row.occurredOn,
      purpose,
    });

    return (
      <Sheet open={open} onOpenChange={(nextOpen) => onOpenChange({ open: nextOpen })}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>繰越の操作</SheetTitle>
            <SheetDescription asChild>
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {row.occurredOn}
                  </span>
                  <PermitCarryoverBadge />
                </div>
                <p className="text-sm text-foreground">
                  {buildPermitCarryoverLabel()} · {formatPermitBalance({ balance: row.quantity })}
                  {row.expiresOn
                    ? ` · ${formatPermitExpiryLabel({ expiresOn: row.expiresOn, today })}`
                    : ""}
                </p>
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 px-4">
            <Link
              href={editHref}
              className={cn(buttonVariants({ variant: "default" }), "h-11 w-full")}
              onClick={() => onOpenChange({ open: false })}
            >
              編集
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => onOpenChange({ open: false })}
            >
              閉じる
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const entry = row.entry;
  const categoryLabel = ledgerCategoryLabels[entry.category as LedgerCategory] ?? entry.category;
  const editable = isLedgerEntryEditable({ category: entry.category });
  const carryover = isAmmoCarryoverEntry({ category: entry.category });
  const editHref = carryover
    ? buildOpeningBalanceHref({
        occurredOn: entry.occurredOn,
        purpose,
      })
    : buildLedgerEntryEditHref({ ledgerEntryId: entry.id });
  const reorderState = resolveLedgerEntryReorderState({ rows, ledgerEntryId: entry.id });

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => onOpenChange({ open: nextOpen })}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle>記録の操作</SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {entry.occurredOn}
                </span>
                <LedgerCategoryBadge category={entry.category} />
              </div>
              <p className="text-sm text-foreground">
                {entry.ammoTypeName} · {entry.quantity}発
                {permitBalance !== undefined ? ` · 許可残 ${permitBalance}発` : ""}
              </p>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4">
          {editable || carryover ? (
            <Link
              href={editHref}
              className={cn(buttonVariants({ variant: "default" }), "h-11 w-full")}
              onClick={() => onOpenChange({ open: false })}
            >
              編集
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">{categoryLabel}記録は編集できません。</p>
          )}
          <LedgerEntryReorderButtons
            ledgerEntryId={entry.id}
            canMoveUp={reorderState.canMoveUp}
            canMoveDown={reorderState.canMoveDown}
          />
          <VoidLedgerEntryButton
            ledgerEntryId={entry.id}
            onVoided={handleVoided}
            onVoidFailed={handleVoidFailed}
            variant="outline"
            className="h-11 w-full text-sm text-destructive hover:text-destructive"
            label="取消"
          />
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={() => onOpenChange({ open: false })}
          >
            閉じる
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
