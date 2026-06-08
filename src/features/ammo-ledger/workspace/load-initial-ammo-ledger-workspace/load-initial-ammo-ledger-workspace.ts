import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { shouldGuardAmmoLedgerLayout } from "@/features/ammo-ledger/auth/should-guard-ammo-ledger-layout/should-guard-ammo-ledger-layout";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { loadAmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

export async function loadInitialAmmoLedgerWorkspace({
  pathname,
}: {
  pathname: string | null;
}): Promise<AmmoLedgerWorkspacePayload | undefined> {
  if (!shouldGuardAmmoLedgerLayout({ pathname })) {
    return undefined;
  }

  if (!resolveShellRoute({ path: pathname ?? "" })) {
    return undefined;
  }

  const user = await requireAmmoUser({ rateLimit: "read" });
  return loadAmmoLedgerWorkspacePayload({
    userId: user.id,
    accountName: user.name,
  });
}
