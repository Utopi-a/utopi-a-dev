"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AmmoLedgerHomeView } from "@/features/ammo-ledger/components/ammo-ledger-home-view/ammo-ledger-home-view";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSettingsHubView } from "@/features/ammo-ledger/components/ammo-ledger-settings-hub-view/ammo-ledger-settings-hub-view";
import { InventoryView } from "@/features/ammo-ledger/components/inventory-view/inventory-view";
import { LedgerView } from "@/features/ammo-ledger/components/ledger-view/ledger-view";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { matchesNavTarget } from "@/features/ammo-ledger/workspace/matches-nav-target/matches-nav-target";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

type AmmoLedgerShellProps = {
  children: ReactNode;
};

function ShellContent({ route }: { route: NonNullable<ReturnType<typeof resolveShellRoute>> }) {
  switch (route) {
    case "home":
      return <AmmoLedgerHomeView />;
    case "ledger":
      return <LedgerView />;
    case "inventory":
      return <InventoryView />;
    case "settings-hub":
      return <AmmoLedgerSettingsHubView />;
  }
}

export function AmmoLedgerShell({ children }: AmmoLedgerShellProps) {
  const pathname = usePathname();
  const { activePath } = useAmmoLedgerOptimisticNav();
  const effectivePath = activePath ?? pathname;
  const shellRoute = resolveShellRoute({ path: effectivePath });

  if (shellRoute) {
    return (
      <div className="space-y-5">
        <AmmoLedgerNav />
        <ShellContent route={shellRoute} />
      </div>
    );
  }

  if (activePath && !matchesNavTarget({ target: activePath, current: pathname })) {
    return (
      <div className="space-y-5">
        <AmmoLedgerNav />
        <WorkspaceViewLoader />
      </div>
    );
  }

  return <>{children}</>;
}
