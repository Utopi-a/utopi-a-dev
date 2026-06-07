"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LedgerYearSelect } from "@/features/ammo-ledger/components/ledger-year-select/ledger-year-select";
import { PrintButton } from "@/features/ammo-ledger/components/print-button/print-button";
import { cn } from "@/lib/cn";

type LedgerPrintControlsProps = {
  years: number[];
  selectedYear: number;
  backHref?: string;
};

export function LedgerPrintControls({
  years,
  selectedYear,
  backHref = "/lab/ammo-ledger/ledger",
}: LedgerPrintControlsProps) {
  const router = useRouter();

  function handleYearChange({ year }: { year: number }) {
    router.push(`/lab/ammo-ledger/ledger/print?year=${year}`);
  }

  return (
    <div className="no-print space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← 帳簿に戻る
        </Link>
        <PrintButton />
      </div>

      <div className="max-w-xs rounded-xl border border-border/60 bg-card/50 px-4 py-4">
        <LedgerYearSelect
          years={years}
          value={selectedYear}
          onChange={handleYearChange}
          label="印刷する年"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {selectedYear}年1月1日〜12月31日の記録を印刷します。
        </p>
      </div>
    </div>
  );
}
