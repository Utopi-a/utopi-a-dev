"use client";

import { useCallback } from "react";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import {
  isClientShellNavPath,
  isWorkspaceShellRoute,
  resolveShellRoute,
} from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";
import { useRequestAmmoLedgerWorkspaceRevalidation } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function useAmmoLedgerClientNav() {
  const { setActivePath } = useAmmoLedgerOptimisticNav();
  const requestWorkspaceRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();

  const navigate = useCallback(
    ({ href }: { href: string }) => {
      if (!isClientShellNavPath({ path: href })) {
        return false;
      }

      const shellRoute = resolveShellRoute({ path: href });
      if (process.env.NODE_ENV === "development") {
        performance.mark(`ammo-ledger:nav:${href}:start`);
      }

      setActivePath({ path: href });
      if (shellRoute && isWorkspaceShellRoute({ route: shellRoute })) {
        requestWorkspaceRevalidation();
      }
      window.history.pushState(window.history.state, "", href);

      if (process.env.NODE_ENV === "development") {
        performance.mark(`ammo-ledger:nav:${href}:end`);
        performance.measure(
          `ammo-ledger:nav:${href}`,
          `ammo-ledger:nav:${href}:start`,
          `ammo-ledger:nav:${href}:end`,
        );
      }

      return true;
    },
    [requestWorkspaceRevalidation, setActivePath],
  );

  return { navigate };
}
