import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { VoidLedgerEntryButton } from "@/features/ammo-ledger/components/ledger-table/void-ledger-entry-button";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";

type LedgerTableProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
};

export function LedgerTable({ entries }: LedgerTableProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">記録がありません。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border/70 bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">日付</th>
            <th className="px-3 py-2 font-medium">区分</th>
            <th className="px-3 py-2 font-medium">種類</th>
            <th className="px-3 py-2 font-medium">数量</th>
            <th className="px-3 py-2 font-medium">場所</th>
            <th className="px-3 py-2 font-medium">相手方</th>
            <th className="px-3 py-2 font-medium">使用銃</th>
            <th className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 whitespace-nowrap">{entry.occurredOn}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {ledgerCategoryLabels[entry.category as keyof typeof ledgerCategoryLabels] ??
                  entry.category}
              </td>
              <td className="px-3 py-2">{entry.ammoTypeName}</td>
              <td className="px-3 py-2 whitespace-nowrap">{entry.quantity}発</td>
              <td className="px-3 py-2">{entry.location ?? "—"}</td>
              <td className="px-3 py-2">
                {entry.counterpartyName
                  ? `${entry.counterpartyName}${entry.counterpartyAddress ? ` / ${entry.counterpartyAddress}` : ""}`
                  : "—"}
              </td>
              <td className="px-3 py-2">
                {entry.gunName
                  ? `${entry.gunName}${entry.gunPermitNumber ? `（${entry.gunPermitNumber}）` : ""}`
                  : "—"}
              </td>
              <td className="px-3 py-2">
                <VoidLedgerEntryButton ledgerEntryId={entry.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
