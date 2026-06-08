"use server";

import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

export async function getDraftTransactionAction({ draftId }: { draftId: string }) {
  const user = await requireAmmoUser({ rateLimit: "read" });
  return getDraftTransaction({ userId: user.id, draftId });
}
