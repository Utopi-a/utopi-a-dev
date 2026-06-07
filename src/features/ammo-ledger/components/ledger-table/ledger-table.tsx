import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { VoidLedgerEntryButton } from "@/features/ammo-ledger/components/ledger-table/void-ledger-entry-button";
import {
  type LedgerCategory,
  ledgerCategoryLabels,
} from "@/features/ammo-ledger/schema/ledger-category";
import { cn } from "@/lib/cn";

type LedgerTableProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
  onVoided?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
  onVoidFailed?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
};

const categoryTone: Record<LedgerCategory, string> = {
  acquire: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  consume: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  transfer: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  dispose: "bg-muted text-muted-foreground",
  manufacture: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const ledgerTableColumnClass = {
  date: "min-w-24 whitespace-nowrap",
  category: "w-16 min-w-16 whitespace-nowrap",
  ammoType: "min-w-28",
  quantity: "min-w-20 whitespace-nowrap text-right",
  permitBalance: "min-w-24 whitespace-nowrap text-right",
  location: "min-w-32",
  counterparty: "min-w-36",
  gun: "min-w-28",
  actions: "min-w-16 whitespace-nowrap",
} as const;

function LedgerCategoryBadge({ category }: { category: string }) {
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

export function LedgerTable({
  entries,
  permitBalances,
  homeStorageExceededEntryIds = [],
  onVoided,
  onVoidFailed,
}: LedgerTableProps) {
  const exceededSet = new Set(homeStorageExceededEntryIds);
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        まだ記録がありません。消費や譲り受けを入力するとここに表示されます。
      </p>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <p className="mb-2 text-xs text-muted-foreground sm:hidden">表は横にスクロールできます</p>
      <table className="w-max min-w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left text-xs font-medium text-muted-foreground">
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.date)}>日付</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.category)}>区分</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.ammoType)}>種類</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.quantity)}>数量</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.permitBalance)}>許可残数</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.location)}>場所</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.counterparty)}>相手方</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.gun)}>使用銃</th>
            <th className={cn("px-3 py-2.5", ledgerTableColumnClass.actions)} />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className={cn(
                "border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20",
                exceededSet.has(entry.id) && "bg-amber-500/5",
              )}
            >
              <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.date)}>
                <span className="whitespace-nowrap tabular-nums">{entry.occurredOn}</span>
              </td>
              <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.category)}>
                <LedgerCategoryBadge category={entry.category} />
              </td>
              <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.ammoType)}>
                <span className="font-medium">{entry.ammoTypeName}</span>
              </td>
              <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.quantity)}>
                <span className="block font-medium whitespace-nowrap tabular-nums">
                  {entry.quantity}発
                </span>
              </td>
              <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.permitBalance)}>
                <span className="block whitespace-nowrap text-muted-foreground tabular-nums">
                  {permitBalances?.has(entry.id) ? `${permitBalances.get(entry.id)}発` : "—"}
                </span>
              </td>
              <td
                className={cn(
                  "px-3 py-3 align-top text-muted-foreground",
                  ledgerTableColumnClass.location,
                )}
              >
                {entry.location ?? "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-3 align-top text-muted-foreground",
                  ledgerTableColumnClass.counterparty,
                )}
              >
                {entry.counterpartyName ? (
                  <span className="block max-w-[12rem] leading-snug">
                    {entry.counterpartyName}
                    {entry.counterpartyAddress ? (
                      <span className="mt-0.5 block text-xs">{entry.counterpartyAddress}</span>
                    ) : null}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td
                className={cn(
                  "px-3 py-3 align-top text-muted-foreground",
                  ledgerTableColumnClass.gun,
                )}
              >
                {entry.gunName ? (
                  <span className="block leading-snug">
                    {entry.gunName}
                    {entry.gunPermitNumber ? (
                      <span className="mt-0.5 block text-xs">{entry.gunPermitNumber}</span>
                    ) : null}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.actions)}>
                <VoidLedgerEntryButton
                  ledgerEntryId={entry.id}
                  onVoided={onVoided}
                  onVoidFailed={onVoidFailed}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
