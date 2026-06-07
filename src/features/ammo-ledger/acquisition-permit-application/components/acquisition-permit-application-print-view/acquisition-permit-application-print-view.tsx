"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { loadAcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-session";
import type { BuiltApplicationFieldValues } from "@/features/ammo-ledger/acquisition-permit-application/build-application-field-values/build-application-field-values";
import { buildApplicationFieldValues } from "@/features/ammo-ledger/acquisition-permit-application/build-application-field-values/build-application-field-values";
import { ApplicationPrintButtons } from "@/features/ammo-ledger/acquisition-permit-application/components/application-print-buttons/application-print-buttons";
import { AcquisitionPermitApplicationDocument } from "@/features/ammo-ledger/acquisition-permit-application/documents/acquisition-permit-application-document/acquisition-permit-application-document";
import { isFieldCalibrationEnabled } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/is-field-calibration-enabled";
import { cn } from "@/lib/cn";

export function AcquisitionPermitApplicationPrintView() {
  const [fieldValues, setFieldValues] = useState<BuiltApplicationFieldValues | null>(null);

  useEffect(() => {
    const payload = loadAcquisitionPermitApplicationPayload();
    if (!payload) {
      setFieldValues(null);
      return;
    }

    setFieldValues(buildApplicationFieldValues({ input: payload }));
  }, []);

  if (!fieldValues) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          印刷データがありません。先に申請書入力画面で内容を作成してください。
        </p>
        <Link
          href="/lab/ammo-ledger/applications/acquisition-permit/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          申請書を作る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/lab/ammo-ledger/applications/acquisition-permit/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← 入力に戻る
          </Link>
          {isFieldCalibrationEnabled() ? (
            <Link
              href="/lab/ammo-ledger/applications/acquisition-permit/calibration"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              座標調整
            </Link>
          ) : null}
        </div>
        <ApplicationPrintButtons supplementPageCount={fieldValues.supplementPageCount} />
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <strong>申請書:</strong>「両面」・「長辺とじ」・倍率
            100%・余白なしで印刷（表→裏の2ページ）。
          </p>
          <p>
            <strong>別紙:</strong>「片面」・倍率
            100%・余白なし。枚数分ある場合は1枚ずつ、または片面で全ページ印刷。
          </p>
        </div>
      </div>

      <AcquisitionPermitApplicationDocument fieldValues={fieldValues} />
    </div>
  );
}
