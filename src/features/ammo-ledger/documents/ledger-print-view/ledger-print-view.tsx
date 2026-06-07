import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerPrintViewProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  from: string;
  to: string;
  purpose: LedgerPurpose;
  permitBalances?: Map<string, number>;
};

export function LedgerPrintView({
  entries,
  from,
  to,
  purpose,
  permitBalances,
}: LedgerPrintViewProps) {
  return (
    <section className="ledger-print-page space-y-4">
      <header className="text-center">
        <h1 className="text-xl font-bold">実包管理帳簿（{ledgerPurposeLabels[purpose]}）</h1>
        <p className="text-sm">
          期間: {from} 〜 {to}
        </p>
      </header>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1">日付</th>
            <th className="border border-black px-2 py-1">区分</th>
            <th className="border border-black px-2 py-1">種類</th>
            <th className="border border-black px-2 py-1">数量</th>
            <th className="border border-black px-2 py-1">許可残数</th>
            <th className="border border-black px-2 py-1">場所</th>
            <th className="border border-black px-2 py-1">相手方</th>
            <th className="border border-black px-2 py-1">使用銃</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="border border-black px-2 py-1 whitespace-nowrap">
                {entry.occurredOn}
              </td>
              <td className="border border-black px-2 py-1 whitespace-nowrap">
                {ledgerCategoryLabels[entry.category as keyof typeof ledgerCategoryLabels] ??
                  entry.category}
              </td>
              <td className="border border-black px-2 py-1">{entry.ammoTypeName}</td>
              <td className="border border-black px-2 py-1 text-right">{entry.quantity}発</td>
              <td className="border border-black px-2 py-1 text-right">
                {permitBalances?.has(entry.id) ? `${permitBalances.get(entry.id)}発` : ""}
              </td>
              <td className="border border-black px-2 py-1">{entry.location ?? ""}</td>
              <td className="border border-black px-2 py-1">
                {entry.counterpartyName ?? ""}
                {entry.counterpartyAddress ? ` ${entry.counterpartyAddress}` : ""}
              </td>
              <td className="border border-black px-2 py-1">
                {entry.gunName ?? ""}
                {entry.gunPermitNumber ? ` ${entry.gunPermitNumber}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
