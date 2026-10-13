"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerOfflineNotice } from "@/features/ammo-ledger/components/ammo-ledger-offline-notice/ammo-ledger-offline-notice";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import {
  AmmoLedgerRefreshError,
  AmmoLedgerRefreshStatus,
} from "@/features/ammo-ledger/components/ammo-ledger-refresh-indicator/ammo-ledger-refresh-indicator";
import { PendingLedgerChangeAlerts } from "@/features/ammo-ledger/components/pending-ledger-change-alerts/pending-ledger-change-alerts";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { matchesNavTarget } from "@/features/ammo-ledger/workspace/matches-nav-target/matches-nav-target";
import {
  isWorkspaceShellRoute,
  resolveShellRoute,
} from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

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

// 保存後に帳簿へ移動した瞬間にビューの読込待ちが出ないよう、アイドル時に先読みする。
function usePreloadShellViews() {
  useEffect(() => {
    function preload() {
      void import("@/features/ammo-ledger/components/ledger-view/ledger-view");
      void import("@/features/ammo-ledger/components/inventory-view/inventory-view");
      void import("@/features/ammo-ledger/components/ammo-ledger-home-view/ammo-ledger-home-view");
    }
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(preload, 1500);
    return () => clearTimeout(timer);
  }, []);
}

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
  usePreloadShellViews();

  if (shellRoute) {
    const showsWorkspace = isWorkspaceShellRoute({ route: shellRoute });
    return (
      <div className="space-y-5">
        <AmmoLedgerNav status={showsWorkspace ? <AmmoLedgerRefreshStatus /> : null} />
        <AmmoLedgerOfflineNotice />
        <PendingLedgerChangeAlerts />
        {showsWorkspace ? <AmmoLedgerRefreshError /> : null}
        <ShellContent route={shellRoute} />
      </div>
    );
  }

  if (activePath && !matchesNavTarget({ target: activePath, current: pathname })) {
    return (
      <div className="space-y-5">
        <AmmoLedgerNav />
        <AmmoLedgerOfflineNotice />
        <WorkspaceViewLoader />
      </div>
    );
  }

  return <>{children}</>;
}
