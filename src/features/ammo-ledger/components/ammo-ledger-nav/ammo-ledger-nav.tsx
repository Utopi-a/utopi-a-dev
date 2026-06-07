"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className="inline-flex w-full rounded-lg border border-border/60 bg-muted/30 p-1">
      {navItems.map((item) => {
        const isActive = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-none"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
