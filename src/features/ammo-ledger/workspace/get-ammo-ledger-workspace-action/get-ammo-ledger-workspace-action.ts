"use server";

import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { loadAmmoLedgerWorkspacePayloadForSession } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";

export async function getAmmoLedgerWorkspaceAction(): Promise<AmmoLedgerWorkspacePayload> {
  if (typeof performance !== "undefined") {
    performance.mark("workspace:fetch:start");
  }

  const payload = await loadAmmoLedgerWorkspacePayloadForSession();

  if (typeof performance !== "undefined") {
    performance.mark("workspace:fetch:end");
    performance.measure("workspace:fetch", "workspace:fetch:start", "workspace:fetch:end");
  }

  return payload;
}
