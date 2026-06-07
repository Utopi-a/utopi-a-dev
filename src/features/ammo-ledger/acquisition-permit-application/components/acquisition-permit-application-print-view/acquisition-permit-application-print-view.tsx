"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { loadAcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-session";
import type { BuiltApplicationFieldValues } from "@/features/ammo-ledger/acquisition-permit-application/build-application-field-values/build-application-field-values";
import { buildApplicationFieldValues } from "@/features/ammo-ledger/acquisition-permit-application/build-application-field-values/build-application-field-values";
import { AcquisitionPermitApplicationDocument } from "@/features/ammo-ledger/acquisition-permit-application/documents/acquisition-permit-application-document/acquisition-permit-application-document";
import { PrintButton } from "@/features/ammo-ledger/components/print-button/print-button";
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
      <div className="no-print flex flex-wrap gap-2">
        <Link
          href="/lab/ammo-ledger/applications/acquisition-permit/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 入力に戻る
        </Link>
        <PrintButton />
      </div>

      <AcquisitionPermitApplicationDocument fieldValues={fieldValues} />
    </div>
  );
}
