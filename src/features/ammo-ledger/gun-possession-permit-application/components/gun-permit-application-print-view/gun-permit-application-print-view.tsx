"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AcquisitionPermitApplicationStyles } from "@/features/ammo-ledger/acquisition-permit-application/documents/acquisition-permit-application-styles/acquisition-permit-application-styles";
import { cn } from "@/lib/cn";
import { isDevelopmentEnvironment } from "@/lib/is-development-environment";
import { loadGunPermitApplicationPayload } from "../../application-session/application-session";
import {
  type BuiltGunPermitFieldValues,
  buildGunPermitFieldValues,
} from "../../build-field-values/build-field-values";
import {
  type BuiltSupplementaryFieldValues,
  buildSupplementaryFieldValues,
} from "../../build-supplementary-field-values/build-supplementary-field-values";
import { GunPermitApplicationDocument } from "../../documents/gun-permit-application-document/gun-permit-application-document";
import { GunPermitSupplementaryDocument } from "../../documents/gun-permit-supplementary-document/gun-permit-supplementary-document";
import type { GunPermitApplicationPayload } from "../../gun-possession-permit-application-types";
import { GunPermitApplicationPrintButtons } from "../gun-permit-application-print-buttons/gun-permit-application-print-buttons";
import { RequiredDocumentsChecklist } from "../required-documents-checklist/required-documents-checklist";

export function GunPermitApplicationPrintView() {
  const [payload, setPayload] = useState<GunPermitApplicationPayload | null>(null);
  const [fieldValues, setFieldValues] = useState<BuiltGunPermitFieldValues | null>(null);
  const [supplementary, setSupplementary] = useState<BuiltSupplementaryFieldValues | null>(null);

  useEffect(() => {
    const loaded = loadGunPermitApplicationPayload();
    if (!loaded) {
      setPayload(null);
      setFieldValues(null);
      setSupplementary(null);
      return;
    }

    setPayload(loaded);
    setFieldValues(buildGunPermitFieldValues({ input: loaded }));
    setSupplementary(buildSupplementaryFieldValues({ input: loaded }));
  }, []);

  if (!fieldValues || !payload) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          印刷データがありません。先に申請書入力画面で内容を作成してください。
        </p>
        <Link
          href="/lab/ammo-ledger/applications/gun-possession-permit/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          申請書を作る
        </Link>
      </div>
    );
  }

  const hasResume =
    (supplementary?.resumeWorkRows.length ?? 0) > 0 ||
    (supplementary?.resumeAddressRows.length ?? 0) > 0;
  const hasCohabitants = (supplementary?.cohabitantRows.length ?? 0) > 0;
  const supplementSetCount = payload.kind === "renewal" ? 1 : fieldValues.supplementGunPages.length;

  return (
    <div className="space-y-4">
      <div className="no-print space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/lab/ammo-ledger/applications/gun-possession-permit/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← 入力に戻る
          </Link>
          {isDevelopmentEnvironment() ? (
            <Link
              href="/lab/ammo-ledger/applications/gun-possession-permit/calibration"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              座標調整
            </Link>
          ) : null}
        </div>
        <GunPermitApplicationPrintButtons
          kind={payload.kind}
          supplementSetCount={supplementSetCount}
          hasResume={hasResume}
          hasCohabitants={hasCohabitants}
        />
        <p className="text-sm text-muted-foreground">
          署名・押印欄は手書きで記入してください。座標はキャリブレーション前の初期値です。
        </p>
      </div>

      <div className="application-form-print">
        <AcquisitionPermitApplicationStyles />
        <GunPermitApplicationDocument kind={payload.kind} fieldValues={fieldValues} />
        {supplementary ? <GunPermitSupplementaryDocument supplementary={supplementary} /> : null}
      </div>

      <div className="no-print mt-6">
        <RequiredDocumentsChecklist input={payload} showPrintHints />
      </div>
    </div>
  );
}
