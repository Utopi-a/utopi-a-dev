import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";

export async function listCounterparties({ userId }: { userId: string }) {
  return db
    .select()
    .from(ammoCounterparty)
    .where(eq(ammoCounterparty.userId, userId))
    .orderBy(ammoCounterparty.name);
}
