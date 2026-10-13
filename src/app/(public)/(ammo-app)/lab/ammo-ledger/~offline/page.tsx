"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { AmmoLedgerShellLink } from "@/features/ammo-ledger/components/ammo-ledger-shell-link/ammo-ledger-shell-link";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { cn } from "@/lib/cn";

export const metadata = { title: "オフライン" };

export default function AmmoLedgerOfflinePage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">オフラインです</h1>
      <p className="text-sm text-muted-foreground">
        記録の保存と帳簿の表示には電波が必要です。つながる場所で再読み込みしてください。
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {/* この案内は開こうとした画面のURLのまま出るため、再読み込みでその画面を取り直せる。 */}
        <Button type="button" size="lg" onClick={() => window.location.reload()}>
          再読み込み
        </Button>
        <AmmoLedgerShellLink
          href={ammoLedgerPwaConfig.startUrl}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          ホームへ
        </AmmoLedgerShellLink>
      </div>
    </div>
  );
}
