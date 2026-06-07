"use client";

import { useState } from "react";
import { LedgerEntryActionsSheet } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-actions-sheet";
import { LedgerEntryCard } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-card";
import {
  LedgerCategoryBadge,
  PermitCarryoverBadge,
  PermitExpiryBadge,
} from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import {
  buildPermitCarryoverLabel,
  isDisplayRowSelectable,
  type LedgerDisplayRow,
  resolveDisplayRowId,
  resolveDisplayRowPermitBalance,
} from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import {
  formatAmmoQuantity,
  formatPermitBalance,
  showsAmmoQuantity,
} from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type LedgerTableProps = {
  rows: LedgerDisplayRow[];
  purpose: LedgerPurpose;
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
  onVoided?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
  onVoidFailed?: ({ ledgerEntryId }: { ledgerEntryId: string }) => void;
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
} as const;

export function LedgerTable({
  rows,
  purpose,
  permitBalances,
  homeStorageExceededEntryIds = [],
  onVoided,
  onVoidFailed,
}: LedgerTableProps) {
  const [selectedRow, setSelectedRow] = useState<LedgerDisplayRow | null>(null);
  const [selectedPermitBalance, setSelectedPermitBalance] = useState<number | undefined>(undefined);
  const exceededSet = new Set(homeStorageExceededEntryIds);

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
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        まだ記録がありません。年初繰越や消費・譲り受けを入力するとここに表示されます。
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <LedgerEntryCard
            key={resolveDisplayRowId({ row })}
            row={row}
            permitBalance={resolveDisplayRowPermitBalance({ row, permitBalances })}
            isHomeStorageExceeded={row.kind === "entry" ? exceededSet.has(row.entry.id) : false}
            onSelect={handleSelectRow}
          />
        ))}
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
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.permitBalance)}>
                  許可残数
                </th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.location)}>場所</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.counterparty)}>相手方</th>
                <th className={cn("px-3 py-2.5", ledgerTableColumnClass.gun)}>使用銃</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const permitBalance = resolveDisplayRowPermitBalance({ row, permitBalances });
                const selectable = isDisplayRowSelectable({ row });

                if (row.kind === "permit_carryover") {
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      onClick={() => handleSelectRow({ row, permitBalance })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectRow({ row, permitBalance });
                        }
                      }}
                      className="cursor-pointer border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20"
                    >
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.date)}>
                        <span className="whitespace-nowrap tabular-nums">{row.occurredOn}</span>
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.category)}>
                        <PermitCarryoverBadge />
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.ammoType)}>
                        <span className="font-medium">
                          {buildPermitCarryoverLabel({ permitName: row.permitName })}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.quantity)}>
                        <span className="block text-muted-foreground">—</span>
                      </td>
                      <td
                        className={cn("px-3 py-3 align-top", ledgerTableColumnClass.permitBalance)}
                      >
                        <span className="block font-medium whitespace-nowrap tabular-nums">
                          {formatPermitBalance({ balance: row.quantity })}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 align-top text-muted-foreground",
                          ledgerTableColumnClass.location,
                        )}
                      >
                        —
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 align-top text-muted-foreground",
                          ledgerTableColumnClass.counterparty,
                        )}
                      >
                        —
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 align-top text-muted-foreground",
                          ledgerTableColumnClass.gun,
                        )}
                      >
                        —
                      </td>
                    </tr>
                  );
                }

                if (row.kind === "permit_expiry") {
                  return (
                    <tr key={row.id} className="border-b border-border/25 last:border-0">
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.date)}>
                        <span className="whitespace-nowrap tabular-nums">{row.occurredOn}</span>
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.category)}>
                        <PermitExpiryBadge />
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.ammoType)}>
                        <span className="font-medium">{row.permitName}</span>
                      </td>
                      <td className={cn("px-3 py-3 align-top", ledgerTableColumnClass.quantity)}>
                        <span className="block text-muted-foreground">—</span>
                      </td>
                      <td
                        className={cn("px-3 py-3 align-top", ledgerTableColumnClass.permitBalance)}
                      >
                        <span className="block font-medium whitespace-nowrap tabular-nums">
                          {formatPermitBalance({ balance: 0 })}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 align-top text-muted-foreground",
                          ledgerTableColumnClass.location,
                        )}
                      >
                        —
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 align-top text-muted-foreground",
                          ledgerTableColumnClass.counterparty,
                        )}
                      >
                        —
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 align-top text-muted-foreground",
                          ledgerTableColumnClass.gun,
                        )}
                      >
                        —
                      </td>
                    </tr>
                  );
                }

                const entry = row.entry;

                return (
                  <tr
                    key={entry.id}
                    tabIndex={selectable ? 0 : -1}
                    onClick={() =>
                      selectable ? handleSelectRow({ row, permitBalance }) : undefined
                    }
                    onKeyDown={(event) => {
                      if (!selectable) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectRow({ row, permitBalance });
                      }
                    }}
                    className={cn(
                      selectable &&
                        "cursor-pointer border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20",
                      !selectable && "border-b border-border/25 last:border-0",
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
                        {showsAmmoQuantity({ row })
                          ? formatAmmoQuantity({ quantity: entry.quantity })
                          : "—"}
                      </span>
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
                            <span className="mt-0.5 block text-xs">
                              {entry.counterpartyAddress}
                            </span>
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
          行をクリックすると編集・並び替え・取消ができます。琥珀色の行はその時点で自宅保管の目安（800発）を超えています。
        </p>
      </div>

      <LedgerEntryActionsSheet
        row={selectedRow}
        rows={rows}
        purpose={purpose}
        permitBalance={selectedPermitBalance}
        open={selectedRow !== null}
        onOpenChange={handleSheetOpenChange}
        onVoided={onVoided}
        onVoidFailed={onVoidFailed}
      />
    </>
  );
}
