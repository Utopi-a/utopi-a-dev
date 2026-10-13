"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AmmoLedgerShellLink } from "@/features/ammo-ledger/components/ammo-ledger-shell-link/ammo-ledger-shell-link";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { cn } from "@/lib/cn";

type AmmoLedgerRouteErrorProps = {
  reset: () => void;
};

/** サーバーでの取得や描画に失敗した画面の代わりに出す。 */
export function AmmoLedgerRouteError({ reset }: AmmoLedgerRouteErrorProps) {
  const router = useRouter();

  function handleRetry() {
    // サーバーで失敗した画面は取り直さないと、描き直しても同じエラーになる。
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div
      role="alert"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
    >
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">画面を表示できませんでした</h1>
        <p className="text-sm text-muted-foreground">
          通信状態を確認して、もう一度お試しください。
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="lg" onClick={handleRetry}>
          再試行
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
