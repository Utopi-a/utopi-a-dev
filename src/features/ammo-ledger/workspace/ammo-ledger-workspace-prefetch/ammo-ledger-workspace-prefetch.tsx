"use client";

import { usePathname } from "next/navigation";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

function AmmoLedgerWorkspacePrefetchInner() {
  useAmmoLedgerWorkspace();
  return null;
}

export function AmmoLedgerWorkspacePrefetch() {
  const pathname = usePathname();
  const shouldPrefetch = resolveShellRoute({ path: pathname }) !== null;

  if (!shouldPrefetch) {
    return null;
  }

  return <AmmoLedgerWorkspacePrefetchInner />;
}
