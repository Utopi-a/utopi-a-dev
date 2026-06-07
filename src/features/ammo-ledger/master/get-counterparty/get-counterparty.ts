import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";

export async function getCounterparty({ id, userId }: { id: string; userId: string }) {
  const rows = await db
    .select()
    .from(ammoCounterparty)
    .where(and(eq(ammoCounterparty.id, id), eq(ammoCounterparty.userId, userId)));
  return rows[0] ?? null;
}
