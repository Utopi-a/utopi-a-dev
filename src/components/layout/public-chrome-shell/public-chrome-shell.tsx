"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isAmmoLedgerPath({ pathname }: { pathname: string }) {
  return pathname.startsWith("/lab/ammo-ledger");
}

type PublicChromeShellProps = {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

export function PublicChromeShell({ header, footer, children }: PublicChromeShellProps) {
  const pathname = usePathname();
  const isAmmoLedger = isAmmoLedgerPath({ pathname });

  return (
    <>
      {isAmmoLedger ? null : header}
      <main
        className={isAmmoLedger ? "flex h-dvh min-h-0 flex-col" : "flex min-h-0 flex-1 flex-col"}
      >
        {children}
      </main>
      {isAmmoLedger ? null : footer}
    </>
  );
}
