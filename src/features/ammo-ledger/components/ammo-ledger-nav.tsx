import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/lab/ammo-ledger", label: "ホーム" },
  { href: "/lab/ammo-ledger/ledger", label: "帳簿" },
  { href: "/lab/ammo-ledger/inventory", label: "残弾確認" },
  { href: "/lab/ammo-ledger/settings", label: "設定" },
] as const;

export function AmmoLedgerNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
