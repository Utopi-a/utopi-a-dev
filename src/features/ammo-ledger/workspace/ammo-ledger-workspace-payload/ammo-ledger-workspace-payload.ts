import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";

export type AmmoLedgerWorkspacePayload = {
  workspace: AmmoLedgerWorkspace;
  ownerName: string;
};
