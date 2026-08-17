import { isDevAmmoAuthBypassEnabled } from "@/features/ammo-ledger/auth/dev-auth-bypass";
import { resolveDevAmmoUser } from "@/features/ammo-ledger/auth/resolve-dev-ammo-user";
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
  const devEmail = process.env.AMMO_LEDGER_DEV_USER_EMAIL?.trim();
  const ammoUser =
    isDevAmmoAuthBypassEnabled() && devEmail
      ? await resolveDevAmmoUser({ email: devEmail })
      : (
          await requireSession({
            redirectTo: "/login?next=/lab/ammo-ledger",
          })
        ).user;

  if (rateLimit) {
    assertServerActionRateLimit({ userId: ammoUser.id, kind: rateLimit });
  }

  return ammoUser;
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
