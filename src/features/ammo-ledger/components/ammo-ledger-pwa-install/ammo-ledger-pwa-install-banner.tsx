"use client";

import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AmmoLedgerPwaInstallDialog } from "@/features/ammo-ledger/components/ammo-ledger-pwa-install/ammo-ledger-pwa-install-dialog";
import { useAmmoLedgerPwaInstall } from "@/features/ammo-ledger/pwa/use-ammo-ledger-pwa-install/use-ammo-ledger-pwa-install";

export function AmmoLedgerPwaInstallBanner() {
  const { platform, shouldShowBanner, canNativeInstall, dismissBanner, promptNativeInstall } =
    useAmmoLedgerPwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <>
      <section
        aria-label="アプリのインストール"
        className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4"
      >
        <div className="flex items-start gap-3">
          <DownloadIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">ホーム画面に追加</p>
              <p className="text-xs text-muted-foreground">
                射撃場など現場からすぐ開けるよう、アプリのように使えます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                追加方法を見る
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissBanner}>
                後で
              </Button>
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
