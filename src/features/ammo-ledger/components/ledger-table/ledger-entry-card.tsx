import { ChevronRightIcon } from "lucide-react";
import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import {
  LedgerCategoryBadge,
  PermitCarryoverBadge,
} from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import {
  buildPermitCarryoverLabel,
  isDisplayRowSelectable,
  type LedgerDisplayRow,
} from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import { cn } from "@/lib/cn";

type LedgerEntryCardProps = {
  row: LedgerDisplayRow;
  permitBalance?: number;
  isHomeStorageExceeded?: boolean;
  onSelect: ({
    entry,
    permitBalance,
  }: {
    entry: typeof ammoLedgerEntry.$inferSelect;
    permitBalance?: number;
  }) => void;
};

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function LedgerEntryCard({
  row,
  permitBalance,
  isHomeStorageExceeded = false,
  onSelect,
}: LedgerEntryCardProps) {
  if (row.kind === "permit_carryover") {
    return (
      <div className="flex w-full items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3.5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular-nums">{row.occurredOn}</span>
            <PermitCarryoverBadge />
          </div>
          <p className="font-medium leading-snug">
            {buildPermitCarryoverLabel({ occurredOn: row.occurredOn })}
          </p>
          <DetailLine label="許可残数" value={`${row.quantity}発`} />
        </div>
      </div>
    );
  }

  const entry = row.entry;
  const selectable = isDisplayRowSelectable({ row });

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => selectable && onSelect({ entry, permitBalance })}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3.5 text-left transition-colors",
        selectable && "hover:border-border hover:bg-muted/30 active:bg-muted/40",
        !selectable && "cursor-default",
        isHomeStorageExceeded && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium tabular-nums">{entry.occurredOn}</span>
          <LedgerCategoryBadge category={entry.category} />
        </div>
        <p className="font-medium leading-snug">{entry.ammoTypeName}</p>
        <div className="space-y-1">
          <DetailLine label="数量" value={`${entry.quantity}発`} />
          {permitBalance !== undefined ? (
            <DetailLine label="許可残数" value={`${permitBalance}発`} />
          ) : null}
          {entry.location ? <DetailLine label="場所" value={entry.location} /> : null}
          {entry.counterpartyName ? (
            <DetailLine
              label="相手方"
              value={
                entry.counterpartyAddress
                  ? `${entry.counterpartyName}（${entry.counterpartyAddress}）`
                  : entry.counterpartyName
              }
            />
          ) : null}
          {entry.gunName ? (
            <DetailLine
              label="使用銃"
              value={
                entry.gunPermitNumber
                  ? `${entry.gunName}（${entry.gunPermitNumber}）`
                  : entry.gunName
              }
            />
          ) : null}
        </div>
      </div>
      {selectable ? (
        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}
