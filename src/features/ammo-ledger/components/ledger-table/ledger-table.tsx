"use client";

import { useMemo, useState } from "react";
import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { LedgerEntryActionsSheet } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-actions-sheet";
import { LedgerEntryCard } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-card";
import { LedgerCategoryBadge } from "@/features/ammo-ledger/components/ledger-table/ledger-entry-display";
import { cn } from "@/lib/cn";

type LedgerTableProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
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
  entries,
  permitBalances,
  homeStorageExceededEntryIds = [],
  onVoided,
  onVoidFailed,
}: LedgerTableProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const exceededSet = useMemo(
    () => new Set(homeStorageExceededEntryIds),
    [homeStorageExceededEntryIds],
  );
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;

  function handleSelectEntry({ ledgerEntryId }: { ledgerEntryId: string }) {
    setSelectedEntryId(ledgerEntryId);
  }

  function handleSheetOpenChange({ open }: { open: boolean }) {
    if (!open) {
      setSelectedEntryId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        まだ記録がありません。消費や譲り受けを入力するとここに表示されます。
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {entries.map((entry) => (
          <LedgerEntryCard
            key={entry.id}
            entry={entry}
            permitBalance={permitBalances?.get(entry.id)}
            isHomeStorageExceeded={exceededSet.has(entry.id)}
            onSelect={handleSelectEntry}
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
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  tabIndex={0}
                  onClick={() => handleSelectEntry({ ledgerEntryId: entry.id })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectEntry({ ledgerEntryId: entry.id });
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20",
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">行をクリックすると編集・取消ができます</p>
      </div>

      <LedgerEntryActionsSheet
        entry={selectedEntry}
        permitBalance={
          selectedEntry && permitBalances?.has(selectedEntry.id)
            ? permitBalances.get(selectedEntry.id)
            : undefined
        }
        open={selectedEntryId !== null}
        onOpenChange={handleSheetOpenChange}
        onVoided={onVoided}
        onVoidFailed={onVoidFailed}
      />
    </>
  );
}
