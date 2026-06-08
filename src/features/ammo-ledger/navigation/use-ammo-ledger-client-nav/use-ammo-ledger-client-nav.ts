"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { matchesNavTarget } from "@/features/ammo-ledger/workspace/matches-nav-target/matches-nav-target";
import { isClientShellNavPath } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

export function useAmmoLedgerClientNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActivePath } = useAmmoLedgerOptimisticNav();
  const [, startTransition] = useTransition();

  const navigate = useCallback(
    ({ href }: { href: string }) => {
      if (!isClientShellNavPath({ path: href })) {
        return false;
      }

      if (process.env.NODE_ENV === "development") {
        performance.mark(`ammo-ledger:nav:${href}:start`);
      }

      setActivePath({ path: href });
      window.history.pushState(window.history.state, "", href);

      if (!matchesNavTarget({ target: href, current: pathname })) {
        startTransition(() => {
          router.replace(href);
        });
      }

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
    [pathname, router, setActivePath],
  );

  return { navigate };
}
