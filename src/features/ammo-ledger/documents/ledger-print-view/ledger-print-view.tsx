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
import {
  ledgerPrintCellClass,
  ledgerPrintColClass,
} from "@/features/ammo-ledger/documents/ledger-print-table/ledger-print-table-column-classes";
import { formatLedgerGunLabel } from "@/features/ammo-ledger/ledger/format-ledger-gun-label/format-ledger-gun-label";
import {
  formatAmmoQuantity,
  formatPermitBalance,
} from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerPrintViewProps = {
  section: LedgerPrintSection;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  from: string;
  to: string;
  year: number;
  today: string;
};

function LedgerPrintCell({ className, children }: { className: string; children?: ReactNode }) {
  return <td className={cn("ledger-print-cell", className)}>{children}</td>;
}

function LedgerPrintEmptyCells() {
  return (
    <>
      <LedgerPrintCell className={ledgerPrintCellClass.location} />
      <LedgerPrintCell className={ledgerPrintCellClass.counterparty} />
      <LedgerPrintCell className={ledgerPrintCellClass.gun} />
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
  today,
}: LedgerPrintViewProps) {
  const rows = buildLedgerPrintDisplayRows({
    entries,
    permitEvents,
    permits,
    permitName: section.permitName,
    permitPurpose: section.permitPurpose,
    ledgerPurpose: section.ledgerPurpose,
    today,
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
          <col className={ledgerPrintColClass.date} />
          <col className={ledgerPrintColClass.category} />
          <col className={ledgerPrintColClass.permitName} />
          <col className={ledgerPrintColClass.quantity} />
          <col className={ledgerPrintColClass.permitBalance} />
          <col className={ledgerPrintColClass.location} />
          <col className={ledgerPrintColClass.counterparty} />
          <col className={ledgerPrintColClass.gun} />
        </colgroup>
        <thead>
          <tr>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.date)}>日付</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.category)}>区分</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.permitName)}>種別</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.quantity)}>数量</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.permitBalance)}>
              許可残数
            </th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.location)}>場所</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.counterparty)}>相手方</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.gun)}>使用銃</th>
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
                  <LedgerPrintCell className={ledgerPrintCellClass.date}>
                    {formatIsoDateForDisplay({ value: row.occurredOn })}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintCellClass.category}>繰越</LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintCellClass.permitName}>
                    {row.permitName}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintCellClass.quantity} />
                  <LedgerPrintCell className={ledgerPrintCellClass.permitBalance}>
                    {formatPermitBalance({ balance: row.quantity })}
                  </LedgerPrintCell>
                  <LedgerPrintEmptyCells />
                </tr>
              );
            }

            if (row.kind === "permit_expiry") {
              return (
                <tr key={row.id}>
                  <LedgerPrintCell className={ledgerPrintCellClass.date}>
                    {formatIsoDateForDisplay({ value: row.occurredOn })}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintCellClass.category}>
                    許可残数失効
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintCellClass.permitName}>
                    {row.permitName}
                  </LedgerPrintCell>
                  <LedgerPrintCell className={ledgerPrintCellClass.quantity} />
                  <LedgerPrintCell className={ledgerPrintCellClass.permitBalance}>
                    {formatPermitBalance({ balance: 0 })}
                  </LedgerPrintCell>
                  <LedgerPrintEmptyCells />
                </tr>
              );
            }

            const entry = row.entry;

            return (
              <tr key={entry.id}>
                <LedgerPrintCell className={ledgerPrintCellClass.date}>
                  {formatIsoDateForDisplay({ value: entry.occurredOn })}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.category}>
                  {ledgerCategoryLabels[entry.category as keyof typeof ledgerCategoryLabels] ??
                    entry.category}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.permitName}>
                  {row.permitName}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.quantity}>
                  {formatAmmoQuantity({ quantity: entry.quantity })}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.permitBalance}>
                  {permitBalance !== undefined
                    ? formatPermitBalance({ balance: permitBalance })
                    : ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.location}>
                  {entry.location ?? ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.counterparty}>
                  {entry.counterpartyName ?? ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.gun}>
                  {formatLedgerGunLabel({
                    gunName: entry.gunName,
                    gunNumber: entry.gunNumber,
                    gunPermitNumber: entry.gunPermitNumber,
                  })}
                </LedgerPrintCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
