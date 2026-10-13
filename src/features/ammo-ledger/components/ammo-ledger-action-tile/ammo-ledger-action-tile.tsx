"use client";

import { AmmoLedgerNavLink } from "@/features/ammo-ledger/components/ammo-ledger-nav-link/ammo-ledger-nav-link";
import { cn } from "@/lib/cn";

type AmmoLedgerActionTileProps = {
  href: string;
  label: string;
  description: string;
  /** タップした先で何をするか。例: 入力する →、開く → */
  cta: string;
  variant?: "primary" | "secondary";
};

export function AmmoLedgerActionTile({
  href,
  label,
  description,
  cta,
  variant = "secondary",
}: AmmoLedgerActionTileProps) {
  return (
    <AmmoLedgerNavLink
      href={href}
      className={cn(
        "group flex min-h-[4.5rem] w-full flex-col gap-1 rounded-xl border px-4 py-4 text-left transition-colors motion-safe:active:scale-[0.99]",
        variant === "primary"
          ? "border-primary/25 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
          : "border-border/60 bg-card/40 hover:border-border hover:bg-muted/30",
      )}
    >
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
        {cta}
      </span>
    </AmmoLedgerNavLink>
  );
}
