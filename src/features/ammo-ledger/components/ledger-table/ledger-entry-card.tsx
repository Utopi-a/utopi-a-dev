import { ChevronRightIcon } from "lucide-react";
import {
  LedgerCategoryBadge,
  PermitCarryoverBadge,
  PermitExpiryBadge,
} from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import {
  buildPermitCarryoverLabel,
  isDisplayRowSelectable,
  type LedgerDisplayRow,
} from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import {
  formatAmmoQuantity,
  formatEntryAmmoQuantityLabel,
  formatPermitBalance,
} from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { formatPermitExpiryLabel } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { cn } from "@/lib/cn";

type LedgerEntryCardProps = {
  row: LedgerDisplayRow;
  permitBalance?: number;
  isHomeStorageExceeded?: boolean;
  onSelect: ({ row, permitBalance }: { row: LedgerDisplayRow; permitBalance?: number }) => void;
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
  const selectable = isDisplayRowSelectable({ row });

  if (row.kind === "permit_carryover") {
    const today = new Date().toISOString().slice(0, 10);

    return (
      <button
        type="button"
        onClick={() => onSelect({ row, permitBalance })}
        className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3.5 text-left transition-colors hover:border-border hover:bg-muted/30 active:bg-muted/40"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular-nums">{row.occurredOn}</span>
            <PermitCarryoverBadge />
          </div>
          <p className="font-medium leading-snug">
            {buildPermitCarryoverLabel({ permitName: row.permitName })}
          </p>
          <DetailLine label="許可残数" value={formatPermitBalance({ balance: row.quantity })} />
          {row.expiresOn ? (
            <DetailLine
              label="有効期限"
              value={formatPermitExpiryLabel({ expiresOn: row.expiresOn, today })}
            />
          ) : null}
        </div>
        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  if (row.kind === "permit_expiry") {
    return (
      <div className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3.5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular-nums">{row.occurredOn}</span>
            <PermitExpiryBadge />
          </div>
          <p className="font-medium leading-snug">{row.permitName}</p>
          <DetailLine label="許可残数" value={formatPermitBalance({ balance: 0 })} />
        </div>
      </div>
    );
  }

  const entry = row.entry;

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => selectable && onSelect({ row, permitBalance })}
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
          <DetailLine
            label={formatEntryAmmoQuantityLabel({
              category: entry.category as LedgerCategory,
            })}
            value={formatAmmoQuantity({ quantity: entry.quantity })}
          />
          {permitBalance !== undefined ? (
            <DetailLine label="許可残数" value={formatPermitBalance({ balance: permitBalance })} />
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
              value={(() => {
                const details = [entry.gunNumber, entry.gunPermitNumber]
                  .filter(Boolean)
                  .join(" / ");
                return details ? `${entry.gunName}（${details}）` : entry.gunName;
              })()}
            />
          ) : null}
          {isHomeStorageExceeded ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              この時点で自宅保管の目安（800個）を超えています
            </p>
          ) : null}
        </div>
      </div>
      {selectable ? (
        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}
