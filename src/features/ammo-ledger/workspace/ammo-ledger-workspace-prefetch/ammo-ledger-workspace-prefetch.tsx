"use client";

import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function AmmoLedgerWorkspacePrefetch() {
  useAmmoLedgerWorkspace();
  return null;
}
