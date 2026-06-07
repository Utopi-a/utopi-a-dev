import { ChevronRightIcon } from "lucide-react";
import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { LedgerCategoryBadge } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import { cn } from "@/lib/cn";

type LedgerEntryCardProps = {
  entry: typeof ammoLedgerEntry.$inferSelect;
  permitBalance?: number;
  isHomeStorageExceeded?: boolean;
  onSelect: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
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
  entry,
  permitBalance,
  isHomeStorageExceeded = false,
  onSelect,
}: LedgerEntryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect({ ledgerEntryId: entry.id })}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3.5 text-left transition-colors",
        "hover:border-border hover:bg-muted/30 active:bg-muted/40",
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
      <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
