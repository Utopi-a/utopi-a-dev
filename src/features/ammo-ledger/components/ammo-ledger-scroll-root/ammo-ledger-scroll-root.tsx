"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function isCatalogPath({ pathname }: { pathname: string }) {
  return pathname.includes("/catalog");
}

type AmmoLedgerScrollRootProps = {
  children: ReactNode;
};

export function AmmoLedgerScrollRoot({ children }: AmmoLedgerScrollRootProps) {
  const pathname = usePathname();
  const isCatalog = isCatalogPath({ pathname });

  if (isCatalog) {
    return children;
  }

  return <div className={cn("flex min-h-0 flex-1 flex-col")}>{children}</div>;
}
