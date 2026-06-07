import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerProfile } from "@/db/schema/ammo-ledger";

export async function getLedgerProfile({ userId }: { userId: string }) {
  const rows = await db
    .select()
    .from(ammoLedgerProfile)
    .where(eq(ammoLedgerProfile.userId, userId));
  return rows[0] ?? null;
}
