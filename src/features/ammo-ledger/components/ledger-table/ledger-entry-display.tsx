import {
  type LedgerCategory,
  ledgerCategoryLabels,
} from "@/features/ammo-ledger/schema/ledger-category";
import { mapCategoryToInputKind } from "@/features/ammo-ledger/schema/map-category-to-input-kind";
import { cn } from "@/lib/cn";

const categoryTone: Record<LedgerCategory, string> = {
  acquire: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  consume: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  transfer: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  dispose: "bg-muted text-muted-foreground",
  manufacture: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  carryover: "bg-muted text-muted-foreground",
};

export function PermitCarryoverBadge() {
  return (
    <span className="inline-flex min-w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      繰越
    </span>
  );
}

export function isAmmoCarryoverEntry({ category }: { category: string }): boolean {
  return category === "carryover";
}

export function LedgerCategoryBadge({ category }: { category: string }) {
  const label = ledgerCategoryLabels[category as LedgerCategory] ?? category;
  const tone = categoryTone[category as LedgerCategory] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex min-w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function isLedgerEntryEditable({ category }: { category: string }): boolean {
  return mapCategoryToInputKind({ category: category as LedgerCategory }) !== null;
}

export function buildLedgerEntryEditHref({ ledgerEntryId }: { ledgerEntryId: string }): string {
  return `/lab/ammo-ledger/entries/${ledgerEntryId}/edit`;
}
