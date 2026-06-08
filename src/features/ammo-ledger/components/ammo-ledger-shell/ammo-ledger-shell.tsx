"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { matchesNavTarget } from "@/features/ammo-ledger/workspace/matches-nav-target/matches-nav-target";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

const AmmoLedgerHomeView = dynamic(
  () =>
    import("@/features/ammo-ledger/components/ammo-ledger-home-view/ammo-ledger-home-view").then(
      (module) => ({ default: module.AmmoLedgerHomeView }),
    ),
  { loading: () => <WorkspaceViewLoader /> },
);

const LedgerView = dynamic(
  () =>
    import("@/features/ammo-ledger/components/ledger-view/ledger-view").then((module) => ({
      default: module.LedgerView,
    })),
  { loading: () => <WorkspaceViewLoader /> },
);

const InventoryView = dynamic(
  () =>
    import("@/features/ammo-ledger/components/inventory-view/inventory-view").then((module) => ({
      default: module.InventoryView,
    })),
  { loading: () => <WorkspaceViewLoader /> },
);

const AmmoLedgerSettingsHubView = dynamic(
  () =>
    import(
      "@/features/ammo-ledger/components/ammo-ledger-settings-hub-view/ammo-ledger-settings-hub-view"
    ).then((module) => ({ default: module.AmmoLedgerSettingsHubView })),
  { loading: () => <WorkspaceViewLoader /> },
);

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
