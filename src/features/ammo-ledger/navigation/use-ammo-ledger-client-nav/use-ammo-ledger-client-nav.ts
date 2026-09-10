"use client";

import { useCallback } from "react";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { isClientShellNavPath } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

export function useAmmoLedgerClientNav() {
  const { setActivePath } = useAmmoLedgerOptimisticNav();
  const navigate = useCallback(
    ({ href }: { href: string }) => {
      if (!isClientShellNavPath({ path: href })) return false;
      setActivePath({ path: null });
      // Next.js が URL を同期する。内部の history.state を渡すと同期を迂回する。
      window.history.pushState(null, "", href);
      window.scrollTo({ top: 0 });
      return true;
    },
    [setActivePath],
  );
  return { navigate };
}
