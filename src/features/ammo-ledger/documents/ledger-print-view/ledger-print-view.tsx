import type { ReactNode } from "react";
import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import {
  buildLedgerPrintDisplayRows,
  resolvePrintDisplayRowPermitBalance,
} from "@/features/ammo-ledger/documents/ledger-print-section/build-ledger-print-display-rows/build-ledger-print-display-rows";
import type { LedgerPrintSection } from "@/features/ammo-ledger/documents/ledger-print-section/build-ledger-print-sections/build-ledger-print-sections";
import { formatLedgerPrintSectionLabel } from "@/features/ammo-ledger/documents/ledger-print-section/build-ledger-print-sections/build-ledger-print-sections";
import { ledgerPrintTableColumnClass } from "@/features/ammo-ledger/documents/ledger-print-table/ledger-print-table-column-classes";
import {
  formatAmmoQuantity,
  formatPermitBalance,
} from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type LedgerPrintViewProps = {
  section: LedgerPrintSection;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  from: string;
  to: string;
  year: number;
};

function LedgerPrintCell({ className, children }: { className: string; children?: ReactNode }) {
  return <td className={cn("ledger-print-cell", className)}>{children}</td>;
}

function LedgerPrintEmptyCells() {
  return (
    <>
      <LedgerPrintCell className={ledgerPrintTableColumnClass.location} />
      <LedgerPrintCell className={ledgerPrintTableColumnClass.counterparty} />
      <LedgerPrintCell className={ledgerPrintTableColumnClass.gun} />
    </>
  );
}

export function LedgerPrintView({
  section,
  entries,
  permitEvents,
  permits,
  from,
  to,
  year,
}: LedgerPrintViewProps) {
  const rows = buildLedgerPrintDisplayRows({
    entries,
    permitEvents,
    permits,
    permitName: section.permitName,
    permitPurpose: section.permitPurpose,
    ledgerPurpose: section.ledgerPurpose,
    from,
    to,
  });

  const sectionLabel = formatLedgerPrintSectionLabel({ section });

  return (
    <section className="ledger-print-page space-y-4">
      <header className="text-center">
        <h1 className="text-xl font-bold">
          実包管理帳簿（{ledgerPurposeLabels[section.ledgerPurpose]}）
        </h1>
        <p className="text-sm font-medium">{sectionLabel}</p>
        <p className="text-sm">
          {year}年（{from} 〜 {to}）
        </p>
      </header>

      <table className="ledger-print-table">
        <colgroup>
          <col className={ledgerPrintTableColumnClass.date} />
          <col className={ledgerPrintTableColumnClass.category} />
          <col className={ledgerPrintTableColumnClass.permitName} />
          <col className={ledgerPrintTableColumnClass.quantity} />
          <col className={ledgerPrintTableColumnClass.permitBalance} />
          <col className={ledgerPrintTableColumnClass.location} />
          <col className={ledgerPrintTableColumnClass.counterparty} />
          <col className={ledgerPrintTableColumnClass.gun} />
        </colgroup>
        <thead>
          <tr>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.date)}>日付</th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.category)}>区分</th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.permitName)}>
              種別
            </th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.quantity)}>数量</th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.permitBalance)}>
              許可残数
            </th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.location)}>場所</th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.counterparty)}>
              相手方
            </th>
            <th className={cn("ledger-print-cell", ledgerPrintTableColumnClass.gun)}>使用銃</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const permitBalance = resolvePrintDisplayRowPermitBalance({
              row,
              permitBalances: section.permitBalances,
            });

            if (row.kind === "permit_carryover") {
              return (
                <tr key={row.id}>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.date}>
                    {row.occurredOn}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.category}>
                    繰越
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.permitName}>
                    {row.permitName}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.quantity} />
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.permitBalance}>
                    {formatPermitBalance({ balance: row.quantity })}
                  </LedgerPrintCell>
                  <LedgerPrintEmptyCells />
                </tr>
              );
            }

            if (row.kind === "permit_expiry") {
              return (
                <tr key={row.id}>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.date}>
                    {row.occurredOn}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.category}>
                    許可残数失効
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.permitName}>
                    {row.permitName}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.quantity} />
                  <LedgerPrintCell className={ledgerPrintTableColumnClass.permitBalance}>
                    {formatPermitBalance({ balance: 0 })}
                  </LedgerPrintCell>
                  <LedgerPrintEmptyCells />
                </tr>
              );
            }

            const entry = row.entry;

            return (
              <tr key={entry.id}>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.date}>
                  {entry.occurredOn}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.category}>
                  {ledgerCategoryLabels[entry.category as keyof typeof ledgerCategoryLabels] ??
                    entry.category}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.permitName}>
                  {row.permitName}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.quantity}>
                  {formatAmmoQuantity({ quantity: entry.quantity })}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.permitBalance}>
                  {permitBalance !== undefined
                    ? formatPermitBalance({ balance: permitBalance })
                    : ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.location}>
                  {entry.location ?? ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.counterparty}>
                  {entry.counterpartyName ?? ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintTableColumnClass.gun}>
                  {entry.gunName ?? ""}
                </LedgerPrintCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
