"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerOfflineNotice } from "@/features/ammo-ledger/components/ammo-ledger-offline-notice/ammo-ledger-offline-notice";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerShellLink } from "@/features/ammo-ledger/components/ammo-ledger-shell-link/ammo-ledger-shell-link";
import { PendingLedgerChangeAlerts } from "@/features/ammo-ledger/components/pending-ledger-change-alerts/pending-ledger-change-alerts";
import { resolveParentPage } from "@/features/ammo-ledger/navigation/resolve-parent-page/resolve-parent-page";
import { matchesNavTarget } from "@/features/ammo-ledger/workspace/matches-nav-target/matches-nav-target";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

type AmmoLedgerSubpageChromeProps = {
  children: ReactNode;
};

export function AmmoLedgerSubpageChrome({ children }: AmmoLedgerSubpageChromeProps) {
  const pathname = usePathname();
  const { activePath } = useAmmoLedgerOptimisticNav();
  const effectivePath = activePath ?? pathname;
  const shellRoute = resolveShellRoute({ path: effectivePath });

  if (shellRoute) {
    return <>{children}</>;
  }

  if (activePath && !matchesNavTarget({ target: activePath, current: pathname })) {
    return <>{children}</>;
  }

  // ホーム画面に追加したアプリにはブラウザの戻るボタンがないため、一つ上の画面へのリンクを常に出す。
  const parentPage = resolveParentPage({ path: pathname });

  return (
    <div className="space-y-6">
      <AmmoLedgerNav />
      <AmmoLedgerOfflineNotice />
      <PendingLedgerChangeAlerts />
      {parentPage ? (
        // 44px のタップ領域を保ったまま、見出しとの間を詰める。
        <AmmoLedgerShellLink
          href={parentPage.href}
          className="-mt-3 mb-1 flex min-h-11 w-fit items-center pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {parentPage.label}
        </AmmoLedgerShellLink>
      ) : null}
      {children}
    </div>
  );
}
