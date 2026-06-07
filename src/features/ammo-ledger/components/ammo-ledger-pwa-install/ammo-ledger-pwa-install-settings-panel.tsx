"use client";

import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AmmoLedgerPwaInstallDialog } from "@/features/ammo-ledger/components/ammo-ledger-pwa-install/ammo-ledger-pwa-install-dialog";
import { useAmmoLedgerPwaInstall } from "@/features/ammo-ledger/pwa/use-ammo-ledger-pwa-install/use-ammo-ledger-pwa-install";

export function AmmoLedgerPwaInstallSettingsPanel() {
  const { platform, installed, shouldShowSettingsPanel, canNativeInstall, promptNativeInstall } =
    useAmmoLedgerPwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!shouldShowSettingsPanel && !installed) {
    return null;
  }

  return (
    <>
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          アプリ
        </h2>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 px-4 py-4">
          <div className="flex items-start gap-3">
            <DownloadIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {installed ? "ホーム画面に追加済み" : "ホーム画面に追加"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {installed
                    ? "アプリとしてインストールされています。ホーム画面のアイコンから開けます。"
                    : "スマホのホーム画面から、ブラウザなしですぐ開けるようにします。"}
                </p>
              </div>
              {!installed ? (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  追加方法を見る
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <AmmoLedgerPwaInstallDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={platform}
        canNativeInstall={canNativeInstall}
        onNativeInstall={promptNativeInstall}
      />
    </>
  );
}
