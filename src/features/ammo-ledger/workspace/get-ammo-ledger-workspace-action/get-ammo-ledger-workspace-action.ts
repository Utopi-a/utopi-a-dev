"use server";

import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { loadAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace/load-ammo-ledger-workspace";

export type AmmoLedgerWorkspacePayload = {
  workspace: AmmoLedgerWorkspace;
  ownerName: string;
};

export async function getAmmoLedgerWorkspaceAction(): Promise<AmmoLedgerWorkspacePayload> {
  const user = await requireAmmoUser();
  const workspace = await loadAmmoLedgerWorkspace({ userId: user.id });
  const ownerName = resolveOwnerName({
    profileOwnerName: workspace.profile?.ownerName,
    accountName: user.name,
  });

  return { workspace, ownerName };
}
