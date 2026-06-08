"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ApplicationPrintButtons } from "@/features/ammo-ledger/acquisition-permit-application/components/application-print-buttons/application-print-buttons";
import { cn } from "@/lib/cn";
import { loadGunPermitApplicationPayload } from "../../application-session/application-session";
import {
  type BuiltGunPermitFieldValues,
  buildGunPermitFieldValues,
} from "../../build-field-values/build-field-values";
import { GunPermitApplicationDocument } from "../../documents/gun-permit-application-document/gun-permit-application-document";
import type { GunPermitApplicationKind } from "../../gun-possession-permit-application-types";

export function GunPermitApplicationPrintView() {
  const [kind, setKind] = useState<GunPermitApplicationKind>("new");
  const [fieldValues, setFieldValues] = useState<BuiltGunPermitFieldValues | null>(null);

  useEffect(() => {
    const payload = loadGunPermitApplicationPayload();
    if (!payload) {
      setFieldValues(null);
      return;
    }

    setKind(payload.kind);
    setFieldValues(buildGunPermitFieldValues({ input: payload }));
  }, []);

  if (!fieldValues) {
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

  const supplementPageCount = kind === "renewal" ? 1 : fieldValues.supplementGunPages.length * 2;

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
        </div>
        <ApplicationPrintButtons supplementPageCount={supplementPageCount} />
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <strong>申請書:</strong> 倍率 100%・余白なし・A4 白無地。表裏がある様式は両面印刷。
          </p>
          <p>
            <strong>別紙:</strong>{" "}
            片面印刷。座標は初期値のため、提出前に実機で位置を確認してください。
          </p>
        </div>
      </div>

      <GunPermitApplicationDocument kind={kind} fieldValues={fieldValues} />
    </div>
  );
}
