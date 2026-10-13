import { redirect } from "next/navigation";
import { isDevAmmoAuthBypassEnabled } from "@/features/ammo-ledger/auth/dev-auth-bypass";
import { resolveDevAmmoUser } from "@/features/ammo-ledger/auth/resolve-dev-ammo-user";
import type { ServerActionRateLimitKind } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import { assertServerActionRateLimit } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import {
  ServerActionRateLimitError,
  serverActionRateLimitErrorResult,
  serverActionRateLimitMessage,
} from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { unauthenticatedMutationResult } from "@/features/ammo-ledger/auth/unauthenticated-mutation-result/unauthenticated-mutation-result";
import { getSession } from "@/features/auth/get-session/get-session";

type RequireAmmoUserOptions = {
  rateLimit?: ServerActionRateLimitKind;
};

async function findAmmoUser() {
  const devEmail = process.env.AMMO_LEDGER_DEV_USER_EMAIL?.trim();
  if (isDevAmmoAuthBypassEnabled() && devEmail) {
    return resolveDevAmmoUser({ email: devEmail });
  }
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireAmmoUser({ rateLimit }: RequireAmmoUserOptions = {}) {
  const ammoUser = await findAmmoUser();
  if (!ammoUser) {
    redirect("/login?next=/lab/ammo-ledger");
  }

  if (rateLimit) {
    assertServerActionRateLimit({ userId: ammoUser.id, kind: rateLimit });
  }

  return ammoUser;
}

export async function resolveAmmoUserForMutation() {
  const user = await findAmmoUser();
  // 保存の途中で redirect するとルーターがログイン画面へ移って帳簿の画面ごと消え、
  // 手元に残した入力も失われるため、画面側で扱える失敗として返す。
  if (!user) {
    return unauthenticatedMutationResult();
  }

  try {
    assertServerActionRateLimit({ userId: user.id, kind: "mutation" });
  } catch (error) {
    if (error instanceof ServerActionRateLimitError) {
      return serverActionRateLimitErrorResult();
    }
    throw error;
  }

  return { ok: true as const, user };
}

export { serverActionRateLimitMessage };
