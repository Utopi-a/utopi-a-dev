import Link from "next/link";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type PurposeFilterProps = {
  current: LedgerPurpose;
  basePath: string;
  query?: Record<string, string | undefined>;
};

export function PurposeFilter({ current, basePath, query = {} }: PurposeFilterProps) {
  return (
    <nav className="inline-flex w-full rounded-lg border border-border/60 bg-muted/30 p-1">
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
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {ledgerPurposeLabels[purpose]}
          </Link>
        );
      })}
    </nav>
  );
}
