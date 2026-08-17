import type { ReactNode } from "react";
import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { buildLedgerBodyRows } from "@/features/ammo-ledger/documents/build-ledger-body-rows/build-ledger-body-rows";
import { formatAmmoTypeLabel } from "@/features/ammo-ledger/documents/format-ammo-type-label/format-ammo-type-label";
import { formatLedgerRemarks } from "@/features/ammo-ledger/documents/format-ledger-remarks/format-ledger-remarks";
import {
  ledgerPrintCellClass,
  ledgerPrintColClass,
} from "@/features/ammo-ledger/documents/ledger-print-table/ledger-print-table-column-classes";
import { formatLedgerGunLabel } from "@/features/ammo-ledger/ledger/format-ledger-gun-label/format-ledger-gun-label";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerPrintBodyProps = {
  ownerName: string;
  ownerAddress?: string | null;
  ledgerPurpose: LedgerPurpose;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  year: number;
  from: string;
  to: string;
};

function LedgerPrintCell({ className, children }: { className: string; children?: ReactNode }) {
  return <td className={cn("ledger-print-cell", className)}>{children}</td>;
}

export function LedgerPrintBody({
  ownerName,
  ownerAddress,
  ledgerPurpose,
  entries,
  year,
  from,
  to,
}: LedgerPrintBodyProps) {
  const rows = buildLedgerBodyRows({ entries });
  const purposeLabel = ledgerPurposeLabels[ledgerPurpose];
  const colCount = 10;

  return (
    <section className="ledger-print-page">
      <table className="ledger-print-table">
        <colgroup>
          <col className={ledgerPrintColClass.no} />
          <col className={ledgerPrintColClass.date} />
          <col className={ledgerPrintColClass.category} />
          <col className={ledgerPrintColClass.ammoType} />
          <col className={ledgerPrintColClass.receive} />
          <col className={ledgerPrintColClass.pay} />
          <col className={ledgerPrintColClass.balanceByType} />
          <col className={ledgerPrintColClass.totalBalance} />
          <col className={ledgerPrintColClass.gun} />
          <col className={ledgerPrintColClass.remarks} />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={colCount} className="ledger-print-thead-title">
              実包管理帳簿（{purposeLabel}）　{year}年（
              {formatIsoDateForDisplay({ value: from })} 〜 {formatIsoDateForDisplay({ value: to })}
              ）
            </th>
          </tr>
          <tr>
            <th colSpan={colCount} className="ledger-print-thead-info">
              氏名: {ownerName}
              {ownerAddress ? `　住所: ${ownerAddress}` : ""}
            </th>
          </tr>
          <tr className="ledger-print-thead-row">
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.no)}>No.</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.date)}>年月日</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.category)}>区分</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.ammoType)}>実包種類</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.receive)}>受</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.pay)}>払</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.balanceByType)}>
              種類別残
            </th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.totalBalance)}>総残数</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.gun)}>使用銃</th>
            <th className={cn("ledger-print-cell", ledgerPrintCellClass.remarks)}>摘要</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { entry, flow } = row;
            const absQuantity = Math.abs(entry.quantity);
            const remarks = formatLedgerRemarks({
              category: entry.category,
              location: entry.location,
              ledgerNote: entry.ledgerNote,
              counterpartyName: entry.counterpartyName,
            });
            const gunLabel =
              entry.category === "consume"
                ? formatLedgerGunLabel({
                    gunName: entry.gunName,
                    gunPermitNumber: entry.gunPermitNumber,
                    gunNumber: entry.gunNumber,
                  })
                : "";

            const ammoTypeLabel = formatAmmoTypeLabel({
              snapshot: {
                ammoCartridgeType: entry.ammoCartridgeType,
                ammoCaliber: entry.ammoCaliber,
                ammoGaugeNumber: entry.ammoGaugeNumber,
                ammoTypeName: entry.ammoTypeName,
              },
            });

            return (
              <tr key={entry.id}>
                <LedgerPrintCell className={ledgerPrintCellClass.no}>{row.no}</LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.date}>
                  {formatIsoDateForDisplay({ value: entry.occurredOn })}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.category}>
                  {ledgerCategoryLabels[entry.category as keyof typeof ledgerCategoryLabels] ??
                    entry.category}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.ammoType}>
                  {ammoTypeLabel}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.receive}>
                  {flow === "receive" ? absQuantity : ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.pay}>
                  {flow === "pay" ? absQuantity : ""}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.balanceByType}>
                  {row.balanceByType}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.totalBalance}>
                  {row.totalBalance}
                </LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.gun}>{gunLabel}</LedgerPrintCell>
                <LedgerPrintCell className={ledgerPrintCellClass.remarks}>
                  {remarks}
                </LedgerPrintCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
