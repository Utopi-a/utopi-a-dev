"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
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

  return (
    <div className="space-y-6">
      <AmmoLedgerNav />
      {children}
    </div>
  );
}
