import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
    <div className="flex flex-wrap gap-2">
      {ledgerPurposes.map((purpose) => {
        const params = new URLSearchParams();
        params.set("purpose", purpose);
        for (const [key, value] of Object.entries(query)) {
          if (value) {
            params.set(key, value);
          }
        }

        return (
          <Link
            key={purpose}
            href={`${basePath}?${params.toString()}`}
            className={cn(
              buttonVariants({
                variant: purpose === current ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {ledgerPurposeLabels[purpose]}
          </Link>
        );
      })}
    </div>
  );
}
