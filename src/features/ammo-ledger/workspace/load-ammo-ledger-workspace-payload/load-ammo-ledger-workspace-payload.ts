import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { loadAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace/load-ammo-ledger-workspace";

export async function loadAmmoLedgerWorkspacePayload({
  userId,
  accountName,
}: {
  userId: string;
  accountName: string | null | undefined;
}): Promise<AmmoLedgerWorkspacePayload> {
  const workspace = await loadAmmoLedgerWorkspace({ userId });
  const ownerName = resolveOwnerName({
    profileOwnerName: workspace.profile?.ownerName,
    accountName: accountName ?? "",
  });

  return { workspace, ownerName };
}

export async function loadAmmoLedgerWorkspacePayloadForSession(): Promise<AmmoLedgerWorkspacePayload> {
  const user = await requireAmmoUser({ rateLimit: "read" });
  return loadAmmoLedgerWorkspacePayload({
    userId: user.id,
    accountName: user.name,
  });
}
