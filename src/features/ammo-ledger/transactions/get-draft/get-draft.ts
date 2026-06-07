import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoTransaction } from "@/db/schema/ammo-ledger";

export async function getDraftTransaction({
  userId,
  draftId,
}: {
  userId: string;
  draftId: string;
}) {
  const [draft] = await db
    .select()
    .from(ammoTransaction)
    .where(
      and(
        eq(ammoTransaction.id, draftId),
        eq(ammoTransaction.userId, userId),
        eq(ammoTransaction.status, "draft"),
      ),
    );

  return draft ?? null;
}
