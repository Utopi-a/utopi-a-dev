import type { ServerActionRateLimitKind } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import { assertServerActionRateLimit } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import {
  ServerActionRateLimitError,
  serverActionRateLimitErrorResult,
  serverActionRateLimitMessage,
} from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { requireSession } from "@/features/auth/require-session/require-session";

type RequireAmmoUserOptions = {
  rateLimit?: ServerActionRateLimitKind;
};

export async function requireAmmoUser({ rateLimit }: RequireAmmoUserOptions = {}) {
  const session = await requireSession({ redirectTo: "/login?next=/lab/ammo-ledger" });

  if (rateLimit) {
    assertServerActionRateLimit({ userId: session.user.id, kind: rateLimit });
  }

  return session.user;
}

export async function resolveAmmoUserForMutation() {
  try {
    const user = await requireAmmoUser({ rateLimit: "mutation" });
    return { ok: true as const, user };
  } catch (error) {
    if (error instanceof ServerActionRateLimitError) {
      return serverActionRateLimitErrorResult();
    }
    throw error;
  }
}

export { serverActionRateLimitMessage };
