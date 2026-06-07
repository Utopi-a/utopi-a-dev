"use client";

import {
  type LedgerPurpose,
  ledgerPurposes,
  ledgerPurposeTabLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type PurposeFilterProps = {
  current: LedgerPurpose;
  onPurposeChange: ({ nextPurpose }: { nextPurpose: LedgerPurpose }) => void;
};

export function PurposeFilter({ current, onPurposeChange }: PurposeFilterProps) {
  return (
    <nav className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {ledgerPurposes.map((purpose) => {
        const isActive = purpose === current;

        return (
          <button
            key={purpose}
            type="button"
            onClick={() => onPurposeChange({ nextPurpose: purpose })}
            className={cn(
              "flex items-center justify-center rounded-md px-0.5 py-1.5 text-center text-[11px] leading-tight font-medium transition-colors sm:px-2 sm:py-2 sm:text-sm sm:leading-snug",
              isActive
                ? "bg-background text-foreground shadow-none"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {purpose === "pest_control" ? (
              <>
                <span className="sm:hidden">有害駆除</span>
                <span className="hidden sm:inline">{ledgerPurposeTabLabels[purpose]}</span>
              </>
            ) : (
              ledgerPurposeTabLabels[purpose]
            )}
          </button>
        );
      })}
    </nav>
  );
}
