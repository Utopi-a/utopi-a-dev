"use client";

import { Button } from "@/components/ui/button";
import { printApplicationSection } from "@/features/ammo-ledger/acquisition-permit-application/print-application-section/print-application-section";

type ApplicationPrintButtonsProps = {
  supplementPageCount: number;
};

export function ApplicationPrintButtons({ supplementPageCount }: ApplicationPrintButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={() => printApplicationSection({ section: "main" })}>
        申請書を印刷（表裏・両面）
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => printApplicationSection({ section: "supplement" })}
      >
        別紙を印刷（片面×{supplementPageCount}）
      </Button>
    </div>
  );
}
