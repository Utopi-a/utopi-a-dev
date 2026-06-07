import type { ammoLedgerEntry, ammoPermitEvent } from "@/db/schema/ammo-ledger";
import {
  buildLedgerDisplayRows,
  buildPermitCarryoverLabel,
  resolveDisplayRowPermitBalance,
} from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import {
  formatAmmoQuantity,
  formatPermitBalance,
  showsAmmoQuantity,
} from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerPrintViewProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  from: string;
  to: string;
  year: number;
  purpose: LedgerPurpose;
  permitBalances?: Map<string, number>;
};

export function LedgerPrintView({
  entries,
  permitEvents,
  from,
  to,
  year,
  purpose,
  permitBalances,
}: LedgerPrintViewProps) {
  const rows = buildLedgerDisplayRows({
    entries,
    permitEvents,
    purpose,
    from,
    to,
  });

  return (
    <section className="ledger-print-page space-y-4">
      <header className="text-center">
        <h1 className="text-xl font-bold">実包管理帳簿（{ledgerPurposeLabels[purpose]}）</h1>
        <p className="text-sm">
          {year}年（{from} 〜 {to}）
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
          {rows.map((row) => {
            const permitBalance = resolveDisplayRowPermitBalance({ row, permitBalances });

            if (row.kind === "permit_carryover") {
              return (
                <tr key={row.id}>
                  <td className="border border-black px-2 py-1 whitespace-nowrap">
                    {row.occurredOn}
                  </td>
                  <td className="border border-black px-2 py-1 whitespace-nowrap">繰越</td>
                  <td className="border border-black px-2 py-1">{buildPermitCarryoverLabel()}</td>
                  <td className="border border-black px-2 py-1 text-right" />
                  <td className="border border-black px-2 py-1 text-right">
                    {formatPermitBalance({ balance: row.quantity })}
                  </td>
                  <td className="border border-black px-2 py-1" />
                  <td className="border border-black px-2 py-1" />
                  <td className="border border-black px-2 py-1" />
                </tr>
              );
            }

            const entry = row.entry;

            return (
              <tr key={entry.id}>
                <td className="border border-black px-2 py-1 whitespace-nowrap">
                  {entry.occurredOn}
                </td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">
                  {ledgerCategoryLabels[entry.category as keyof typeof ledgerCategoryLabels] ??
                    entry.category}
                </td>
                <td className="border border-black px-2 py-1">{entry.ammoTypeName}</td>
                <td className="border border-black px-2 py-1 text-right">
                  {showsAmmoQuantity({ row })
                    ? formatAmmoQuantity({ quantity: entry.quantity })
                    : ""}
                </td>
                <td className="border border-black px-2 py-1 text-right">
                  {permitBalance !== undefined
                    ? formatPermitBalance({ balance: permitBalance })
                    : ""}
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
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
