"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import { isClientShellNavPath } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";
import { cn } from "@/lib/cn";

type AmmoLedgerActionTileProps = {
  href: string;
  label: string;
  description: string;
  variant?: "primary" | "secondary";
};

export function AmmoLedgerActionTile({
  href,
  label,
  description,
  variant = "secondary",
}: AmmoLedgerActionTileProps) {
  const router = useRouter();
  const { navigate: navigateClientShell } = useAmmoLedgerClientNav();

  const className = cn(
    "group flex min-h-[4.5rem] w-full flex-col gap-1 rounded-xl border px-4 py-4 text-left transition-colors active:scale-[0.99]",
    variant === "primary"
      ? "border-primary/25 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
      : "border-border/60 bg-card/40 hover:border-border hover:bg-muted/30",
  );

  const content = (
    <>
      <span
        className={cn(
          "text-base font-medium",
          variant === "primary" ? "text-foreground" : "text-foreground/90",
        )}
      >
        {label}
      </span>
      <span className="text-sm text-muted-foreground">{description}</span>
      <span className="mt-1 text-xs text-muted-foreground/80 group-hover:text-muted-foreground">
        タップして入力 →
      </span>
    </>
  );

  if (isClientShellNavPath({ path: href })) {
    return (
      <button type="button" onClick={() => navigateClientShell({ href })} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      onClick={(event) => {
        event.preventDefault();
        router.push(href);
      }}
      className={className}
    >
      {content}
    </Link>
  );
}
