"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import { isClientShellNavPath } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";
import { cn } from "@/lib/cn";

const navItems = [
  {
    href: "/lab/ammo-ledger",
    label: "ホーム",
    match: (path: string) => path === "/lab/ammo-ledger",
  },
  {
    href: "/lab/ammo-ledger/ledger",
    label: "帳簿",
    match: (path: string) => path.startsWith("/lab/ammo-ledger/ledger"),
  },
  {
    href: "/lab/ammo-ledger/inventory",
    label: "残弾",
    match: (path: string) => path.startsWith("/lab/ammo-ledger/inventory"),
  },
  {
    href: "/lab/ammo-ledger/settings",
    label: "設定",
    match: (path: string) => path.startsWith("/lab/ammo-ledger/settings"),
  },
] as const;

export function AmmoLedgerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { activePath } = useAmmoLedgerOptimisticNav();
  const { navigate: navigateClientShell } = useAmmoLedgerClientNav();
  const [isPending, startTransition] = useTransition();
  const displayPath = activePath ?? pathname;

  useEffect(() => {
    for (const item of navItems) {
      router.prefetch(item.href);
    }
  }, [router]);

  function handleNavigate({ href }: { href: string }) {
    if (href === displayPath) {
      return;
    }

    if (navigateClientShell({ href })) {
      return;
    }

    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <nav className="grid w-full grid-cols-4 gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {navItems.map((item) => {
        const isActive = item.match(displayPath);

        return (
          <button
            key={item.href}
            type="button"
            onClick={() => handleNavigate({ href: item.href })}
            disabled={isPending && !isClientShellNavPath({ path: item.href })}
            className={cn(
              "flex items-center justify-center rounded-md px-1 py-1.5 text-center text-xs font-medium transition-colors sm:py-2 sm:text-sm",
              isActive
                ? "bg-background text-foreground shadow-none"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
