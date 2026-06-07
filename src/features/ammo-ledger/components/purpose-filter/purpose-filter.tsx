import Link from "next/link";
import {
  type LedgerPurpose,
  ledgerPurposes,
  ledgerPurposeTabLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type PurposeFilterProps = {
  current: LedgerPurpose;
  basePath: string;
  query?: Record<string, string | undefined>;
};

export function PurposeFilter({ current, basePath, query = {} }: PurposeFilterProps) {
  return (
    <nav className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {ledgerPurposes.map((purpose) => {
        const params = new URLSearchParams();
        params.set("purpose", purpose);
        for (const [key, value] of Object.entries(query)) {
          if (value) {
            params.set(key, value);
          }
        }

        const isActive = purpose === current;

        return (
          <Link
            key={purpose}
            href={`${basePath}?${params.toString()}`}
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
          </Link>
        );
      })}
    </nav>
  );
}
