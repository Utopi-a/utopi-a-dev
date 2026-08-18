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
          onClick={() => printApplicationSection({ section: "duplex-bundle" })}
        >
          {isRenewal
            ? "申請書類をまとめて印刷（同居親族書を除く）"
            : "両面書類をまとめて印刷（申請書・別紙・経歴書）"}
        </Button>
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

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">個別に印刷する</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => printApplicationSection({ section: "main" })}
          >
            申請書のみ（表裏・両面）
          </Button>
          {supplementSetCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => printApplicationSection({ section: "supplement" })}
            >
              {isRenewal ? "別紙のみ（片面）" : `別紙のみ（両面×${supplementSetCount}セット）`}
            </Button>
          ) : null}
          {hasResume ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => printApplicationSection({ section: "resume" })}
            >
              経歴書のみ（表裏・両面）
            </Button>
          ) : null}
        </div>
      </details>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          <strong>まとめて印刷:</strong> 倍率 100%・余白なし・A4 白無地。「両面」・長辺とじ。
          {isRenewal
            ? " 申請書・別紙・経歴書を順に出力します（第9号別紙は片面1枚）。"
            : " 申請書→別紙→経歴書の順で表裏が続くので、1回の両面印刷で済みます。"}
        </p>
        {hasCohabitants ? (
          <p>
            <strong>同居親族書:</strong> 片面のみ。別ボタンで印刷してください。
          </p>
        ) : null}
      </div>
    </div>
  );
}
