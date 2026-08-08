"use client";

import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
  ledgerPurposeTabLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type PurposeFilterProps = {
  current: LedgerPurpose;
  entryCounts?: Record<LedgerPurpose, number>;
  onPurposeChange: ({ nextPurpose }: { nextPurpose: LedgerPurpose }) => void;
};

export function PurposeFilter({ current, entryCounts, onPurposeChange }: PurposeFilterProps) {
  return (
    <nav className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {ledgerPurposes.map((purpose) => {
        const isActive = purpose === current;

        return (
          <button
            key={purpose}
            type="button"
            aria-label={
              entryCounts
                ? `${ledgerPurposeLabels[purpose]} ${entryCounts[purpose]}件`
                : ledgerPurposeLabels[purpose]
            }
            onClick={() => onPurposeChange({ nextPurpose: purpose })}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md px-0.5 py-1.5 text-center text-[11px] leading-tight font-medium transition-colors sm:px-2 sm:py-2 sm:text-sm sm:leading-snug",
              isActive
                ? "bg-background text-foreground shadow-none"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>
              {purpose === "pest_control" ? (
                <>
                  <span className="sm:hidden">有害駆除</span>
                  <span className="hidden sm:inline">{ledgerPurposeTabLabels[purpose]}</span>
                </>
              ) : (
                ledgerPurposeTabLabels[purpose]
              )}
            </span>
            {entryCounts ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums sm:text-xs">
                {entryCounts[purpose]}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
