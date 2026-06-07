import { requireSession } from "@/features/auth/require-session/require-session";

export async function requireAmmoUser() {
  const session = await requireSession({ redirectTo: "/login?next=/lab/ammo-ledger" });
  return session.user;
}
