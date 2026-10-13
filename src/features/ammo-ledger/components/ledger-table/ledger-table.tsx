"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { LedgerEntryActionsSheet } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-actions-sheet";
import { LedgerEntryCard } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-card";
import {
  LedgerCategoryBadge,
  PermitCarryoverBadge,
  PermitExpiryBadge,
  SavingBadge,
} from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import { formatLedgerRemarks } from "@/features/ammo-ledger/documents/format-ledger-remarks/format-ledger-remarks";
import {
  buildPermitCarryoverLabel,
  isDisplayRowSelectable,
  type LedgerDisplayRow,
  resolveDisplayRowId,
  resolveDisplayRowPermitBalance,
} from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import type { LedgerRowBalance } from "@/features/ammo-ledger/ledger/build-ledger-row-balances/build-ledger-row-balances";
import {
  formatEntryQuantity,
  formatPermitBalance,
  formatStockQuantity,
} from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerTableProps = {
  rows: LedgerDisplayRow[];
  rowBalances?: Map<string, LedgerRowBalance>;
  purpose: LedgerPurpose;
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
  highlightedEntryId?: string | null;
  lockState?: LedgerLockState;
  savingEntryIds?: ReadonlySet<string>;
  emptyState?: ReactNode;
};

const ledgerTableColumnClass = {
  date: "min-w-24 whitespace-nowrap",
  category: "w-16 min-w-16 whitespace-nowrap",
  ammoType: "min-w-28",
  quantity: "min-w-16 whitespace-nowrap text-right",
  balanceByType: "min-w-20 whitespace-nowrap text-right",
  totalBalance: "min-w-20 whitespace-nowrap text-right",
  permitBalance: "min-w-20 whitespace-nowrap text-right",
  remarks: "min-w-36",
  gun: "min-w-28",
} as const;

const noSavingEntryIds: ReadonlySet<string> = new Set();

function EmptyCell({ className }: { className: string }) {
  return <td className={cn("px-3 py-3 align-top text-muted-foreground", className)}>—</td>;
}

export function LedgerTable({
  rows,
  rowBalances,
  purpose,
  permitBalances,
  homeStorageExceededEntryIds = [],
  highlightedEntryId,
  lockState,
  savingEntryIds = noSavingEntryIds,
  emptyState,
}: LedgerTableProps) {
  const [selectedRow, setSelectedRow] = useState<LedgerDisplayRow | null>(null);
  const [selectedPermitBalance, setSelectedPermitBalance] = useState<number | undefined>(undefined);
  const mobileHighlightedEntryRef = useRef<HTMLDivElement | null>(null);
  const desktopHighlightedEntryRef = useRef<HTMLTableRowElement | null>(null);
  const exceededSet = useMemo(
    () => new Set(homeStorageExceededEntryIds),
    [homeStorageExceededEntryIds],
  );
  const highlightedEntryExists = rows.some(
    (row) => row.kind === "entry" && row.entry.id === highlightedEntryId,
  );

  useEffect(() => {
    if (!highlightedEntryId || !highlightedEntryExists) {
      return;
    }
    const highlightedEntry =
      window.innerWidth >= 768
        ? desktopHighlightedEntryRef.current
        : mobileHighlightedEntryRef.current;
    highlightedEntry?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedEntryExists, highlightedEntryId]);

  function handleSelectRow({
    row,
    permitBalance,
  }: {
    row: LedgerDisplayRow;
    permitBalance?: number;
  }) {
    setSelectedRow(row);
    setSelectedPermitBalance(permitBalance);
  }

  function handleSheetOpenChange({ open }: { open: boolean }) {
    if (!open) {
      setSelectedRow(null);
      setSelectedPermitBalance(undefined);
    }
  }

  if (rows.length === 0) {
    return emptyState;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => {
          const rowId = resolveDisplayRowId({ row });
          const isHighlighted = row.kind === "entry" && row.entry.id === highlightedEntryId;
          return (
            <div
              key={rowId}
              ref={isHighlighted ? mobileHighlightedEntryRef : undefined}
              data-ledger-entry-id={row.kind === "entry" ? row.entry.id : undefined}
              className={cn(
                isHighlighted &&
                  "rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <LedgerEntryCard
                row={row}
                permitBalance={resolveDisplayRowPermitBalance({ row, permitBalances })}
                balance={row.kind === "entry" ? rowBalances?.get(row.entry.id) : undefined}
                isHomeStorageExceeded={row.kind === "entry" ? exceededSet.has(row.entry.id) : false}
                isSaving={row.kind === "entry" && savingEntryIds.has(row.entry.id)}
                onSelect={handleSelectRow}
              />
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs font-medium text-muted-foreground">
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.date)}>日付</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.category)}>区分</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.ammoType)}>種類</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.quantity)}>数量</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.balanceByType)}>
                  種類別残
                </th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.totalBalance)}>総残数</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.permitBalance)}>
                  許可残数
                </th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.remarks)}>摘要</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.gun)}>使用銃</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const permitBalance = resolveDisplayRowPermitBalance({ row, permitBalances });
                const selectable = isDisplayRowSelectable({ row });

                if (row.kind !== "entry") {
                  return (
                    <tr
                      key={row.id}
                      tabIndex={selectable ? 0 : undefined}
                      onClick={() =>
                        selectable ? handleSelectRow({ row, permitBalance }) : undefined
                      }
                      onKeyDown={(event) => {
                        if (selectable && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          handleSelectRow({ row, permitBalance });
                        }
                      }}
                      className={cn(
                        "border-b border-border/25 last:border-0",
                        selectable && "cursor-pointer transition-colors hover:bg-muted/20",
                      )}
                    >
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.date)}>
                        <span className="whitespace-nowrap tabular-nums">
                          {formatIsoDateForDisplay({ value: row.occurredOn })}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.category)}>
                        {row.kind === "permit_carryover" ? (
                          <PermitCarryoverBadge />
                        ) : (
                          <PermitExpiryBadge />
                        )}
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.ammoType)}>
                        <span className="font-medium">
                          {buildPermitCarryoverLabel({ permitName: row.permitName })}
                        </span>
                      </td>
                      <EmptyCell className={ledgerTableColumnClass.quantity} />
                      <EmptyCell className={ledgerTableColumnClass.balanceByType} />
                      <EmptyCell className={ledgerTableColumnClass.totalBalance} />
                      <td
                        className={cn("px-3 py-3 align-top", ledgerTableColumnClass.permitBalance)}
                      >
                        <span className="block font-medium whitespace-nowrap tabular-nums">
                          {permitBalance !== undefined
                            ? formatPermitBalance({ balance: permitBalance })
                            : "—"}
                        </span>
                      </td>
                      <EmptyCell className={ledgerTableColumnClass.remarks} />
                      <EmptyCell className={ledgerTableColumnClass.gun} />
                    </tr>
                  );
                }

                const entry = row.entry;
                const isSaving = savingEntryIds.has(entry.id);
                const entrySelectable = selectable && !isSaving;
                const balance = rowBalances?.get(entry.id);
                const remarks = formatLedgerRemarks({
                  category: entry.category,
                  location: entry.location,
                  ledgerNote: entry.ledgerNote,
                  counterpartyName: entry.counterpartyName,
                });

                return (
                  <tr
                    key={entry.id}
                    ref={entry.id === highlightedEntryId ? desktopHighlightedEntryRef : undefined}
                    data-ledger-entry-id={entry.id}
                    tabIndex={entrySelectable ? 0 : -1}
                    onClick={() =>
                      entrySelectable ? handleSelectRow({ row, permitBalance }) : undefined
                    }
                    onKeyDown={(event) => {
                      if (!entrySelectable) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectRow({ row, permitBalance });
                      }
                    }}
                    className={cn(
                      entrySelectable &&
                        "cursor-pointer border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20",
                      !entrySelectable && "border-b border-border/25 last:border-0",
                      isSaving && "text-muted-foreground",
                      exceededSet.has(entry.id) && "bg-amber-500/5",
                      entry.id === highlightedEntryId &&
                        "bg-primary/10 ring-2 ring-inset ring-primary",
                    )}
                  >
                    <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.date)}>
                      <span className="whitespace-nowrap tabular-nums">
                        {formatIsoDateForDisplay({ value: entry.occurredOn })}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.category)}>
                      <div className="flex flex-col items-start gap-1">
                        <LedgerCategoryBadge category={entry.category} />
                        {isSaving ? <SavingBadge /> : null}
                      </div>
                    </td>
                    <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.ammoType)}>
                      <span className="font-medium">{entry.ammoTypeName}</span>
                    </td>
                    <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.quantity)}>
                      <span className="block font-medium whitespace-nowrap tabular-nums">
                        {formatEntryQuantity({
                          category: entry.category,
                          quantity: entry.quantity,
                        })}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 align-top tabular-nums",
                        ledgerTableColumnClass.balanceByType,
                      )}
                    >
                      {balance ? formatStockQuantity({ quantity: balance.balanceByType }) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 align-top tabular-nums",
                        ledgerTableColumnClass.totalBalance,
                      )}
                    >
                      {balance ? formatStockQuantity({ quantity: balance.totalBalance }) : "—"}
                    </td>
                    <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.permitBalance)}>
                      <span className="block whitespace-nowrap text-muted-foreground tabular-nums">
                        {permitBalance !== undefined
                          ? formatPermitBalance({ balance: permitBalance })
                          : "—"}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 align-top text-muted-foreground",
                        ledgerTableColumnClass.remarks,
                      )}
                    >
                      <span className="block max-w-[14rem] leading-snug">
                        {remarks || "—"}
                        {entry.counterpartyAddress ? (
                          <span className="mt-0.5 block text-xs">{entry.counterpartyAddress}</span>
                        ) : null}
                      </span>
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
                          {entry.gunNumber || entry.gunPermitNumber ? (
                            <span className="mt-0.5 block text-xs">
                              {[entry.gunNumber, entry.gunPermitNumber].filter(Boolean).join(" / ")}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          行をクリックすると編集・並び替え・取消ができます。琥珀色の行はその時点で自宅保管の目安（800個）を超えています。
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        種類別残は帳票と同じく、実包の種類（番径・散弾/単弾）ごとの残数です。
      </p>

      <LedgerEntryActionsSheet
        row={selectedRow}
        rows={rows}
        purpose={purpose}
        permitBalance={selectedPermitBalance}
        lockState={lockState}
        open={selectedRow !== null}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  );
}
