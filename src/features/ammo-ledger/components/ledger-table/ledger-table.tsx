import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { VoidLedgerEntryButton } from "@/features/ammo-ledger/components/ledger-table/void-ledger-entry-button";
import {
  type LedgerCategory,
  ledgerCategoryLabels,
} from "@/features/ammo-ledger/schema/ledger-category";
import { cn } from "@/lib/cn";

type LedgerTableProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
};

const categoryTone: Record<LedgerCategory, string> = {
  acquire: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  consume: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  transfer: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  dispose: "bg-muted text-muted-foreground",
  manufacture: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

function LedgerCategoryBadge({ category }: { category: string }) {
  const label = ledgerCategoryLabels[category as LedgerCategory] ?? category;
  const tone = categoryTone[category as LedgerCategory] ?? "bg-muted text-muted-foreground";

  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}

export function LedgerTable({ entries }: LedgerTableProps) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        まだ記録がありません。消費や譲り受けを入力するとここに表示されます。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="px-3 py-2.5">日付</th>
            <th className="px-3 py-2.5">区分</th>
            <th className="px-3 py-2.5">種類</th>
            <th className="px-3 py-2.5 text-right">数量</th>
            <th className="px-3 py-2.5">場所</th>
            <th className="px-3 py-2.5">相手方</th>
            <th className="px-3 py-2.5">使用銃</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-3 align-top">
                <span className="whitespace-nowrap tabular-nums">{entry.occurredOn}</span>
              </td>
              <td className="px-3 py-3 align-top">
                <LedgerCategoryBadge category={entry.category} />
              </td>
              <td className="px-3 py-3 align-top">
                <span className="font-medium">{entry.ammoTypeName}</span>
              </td>
              <td className="px-3 py-3 align-top">
                <span className="block text-right font-medium whitespace-nowrap tabular-nums">
                  {entry.quantity}発
                </span>
              </td>
              <td className="px-3 py-3 align-top text-muted-foreground">{entry.location ?? "—"}</td>
              <td className="px-3 py-3 align-top text-muted-foreground">
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
              <td className="px-3 py-3 align-top text-muted-foreground">
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
              <td className="px-3 py-3 align-top">
                <VoidLedgerEntryButton ledgerEntryId={entry.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
