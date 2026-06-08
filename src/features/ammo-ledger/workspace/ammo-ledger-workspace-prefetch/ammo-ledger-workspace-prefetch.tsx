"use client";

import { usePathname } from "next/navigation";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

function AmmoLedgerWorkspacePrefetchInner() {
  useAmmoLedgerWorkspace();
  return null;
}

export function AmmoLedgerWorkspacePrefetch() {
  const pathname = usePathname();
  const shouldPrefetch = pathname !== ammoLedgerPwaConfig.offlinePath;

  if (!shouldPrefetch) {
    return null;
  }

  return <AmmoLedgerWorkspacePrefetchInner />;
}
