"use client";

import { usePathname } from "next/navigation";
import { memo, type ReactNode } from "react";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import {
  ammoLedgerNavSections,
  resolveNavSection,
} from "@/features/ammo-ledger/navigation/resolve-nav-section/resolve-nav-section";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import { cn } from "@/lib/cn";

type AmmoLedgerNavProps = {
  /** ナビの直下に重ねて出す短い状態表示。固定したナビと一緒にスクロールしても見える。 */
  status?: ReactNode;
};

export const AmmoLedgerNav = memo(function AmmoLedgerNav({ status }: AmmoLedgerNavProps) {
  const pathname = usePathname();
  const { activePath } = useAmmoLedgerOptimisticNav();
  const { navigate: navigateClientShell } = useAmmoLedgerClientNav();
  const displayPath = activePath ?? pathname;
  const activeSection = resolveNavSection({ path: displayPath });

  function handleNavigate({ href }: { href: string }) {
    if (href !== displayPath) navigateClientShell({ href });
  }

  return (
    // 長い帳簿や一覧の途中からでも別のタブへ移れるよう、画面上端に固定する。
    <div className="sticky top-0 z-30 -mx-4 flex h-(--ammo-ledger-nav-height) items-center border-b border-border/60 bg-background px-4 sm:-mx-6 sm:px-6">
      <nav
        aria-label="帳簿メニュー"
        className="grid w-full grid-cols-4 gap-1 rounded-lg bg-muted p-1"
      >
        {ammoLedgerNavSections.map((section) => {
          const isActive = section.id === activeSection?.id;

          return (
            <button
              key={section.href}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleNavigate({ href: section.href })}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-md px-1 text-center text-sm transition-colors",
                isActive
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "font-medium text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
      {status ? (
        <div className="pointer-events-none absolute inset-x-0 top-full flex justify-center pt-2">
          {status}
        </div>
      ) : null}
    </div>
  );
});
