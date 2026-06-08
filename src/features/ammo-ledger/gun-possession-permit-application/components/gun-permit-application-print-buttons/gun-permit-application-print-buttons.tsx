"use client";

import { Button } from "@/components/ui/button";
import { printApplicationSection } from "@/features/ammo-ledger/acquisition-permit-application/print-application-section/print-application-section";
import type { GunPermitApplicationKind } from "../../gun-possession-permit-application-types";

type GunPermitApplicationPrintButtonsProps = {
  kind: GunPermitApplicationKind;
  supplementSetCount: number;
  hasResume: boolean;
  hasCohabitants: boolean;
};

export function GunPermitApplicationPrintButtons({
  kind,
  supplementSetCount,
  hasResume,
  hasCohabitants,
}: GunPermitApplicationPrintButtonsProps) {
  const isRenewal = kind === "renewal";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => printApplicationSection({ section: "main" })}
        >
          申請書を印刷（表裏・両面）
        </Button>
        {supplementSetCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => printApplicationSection({ section: "supplement" })}
          >
            {isRenewal ? "別紙を印刷（片面）" : `別紙を印刷（両面×${supplementSetCount}セット）`}
          </Button>
        ) : null}
        {hasResume ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => printApplicationSection({ section: "resume" })}
          >
            経歴書を印刷（表裏・両面）
          </Button>
        ) : null}
        {hasCohabitants ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => printApplicationSection({ section: "cohabitants" })}
          >
            同居親族書を印刷（片面）
          </Button>
        ) : null}
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          <strong>申請書:</strong> 倍率 100%・余白なし・A4 白無地。「両面」・長辺とじ。
        </p>
        <p>
          <strong>別紙:</strong>{" "}
          {isRenewal
            ? "第9号別紙は1枚（片面）。"
            : `第6号別紙は申請銃ごとに表裏1セット（両面×${supplementSetCount}）。`}
        </p>
        {hasResume ? (
          <p>
            <strong>経歴書:</strong> 表裏2ページを両面印刷。
          </p>
        ) : null}
        {hasCohabitants ? (
          <p>
            <strong>同居親族書:</strong> 1枚（片面）のみ。
          </p>
        ) : null}
      </div>
    </div>
  );
}
