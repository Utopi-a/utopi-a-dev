import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { shouldGuardAmmoLedgerLayout } from "@/features/ammo-ledger/auth/should-guard-ammo-ledger-layout/should-guard-ammo-ledger-layout";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { loadAmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";
import {
  isWorkspaceShellRoute,
  resolveShellRoute,
} from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

export async function loadInitialAmmoLedgerWorkspace({
  pathname,
}: {
  pathname: string | null;
}): Promise<AmmoLedgerWorkspacePayload | undefined> {
  if (!shouldGuardAmmoLedgerLayout({ pathname })) {
    return undefined;
  }

  const route = resolveShellRoute({ path: pathname ?? "" });
  if (!route || !isWorkspaceShellRoute({ route })) {
    return undefined;
  }

  const user = await requireAmmoUser({ rateLimit: "read" }).catch((error: unknown) => {
    // 初期データは画面側でも取り直せるため、レート制限ではレイアウトごと落とさずに続ける。
    if (error instanceof ServerActionRateLimitError) {
      return null;
    }
    throw error;
  });
  if (!user) {
    return undefined;
  }
  return loadAmmoLedgerWorkspacePayload({
    userId: user.id,
    accountName: user.name,
  });
}
