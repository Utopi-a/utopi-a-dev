import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";

export async function getRange({ id, userId }: { id: string; userId: string }) {
  const rows = await db
    .select()
    .from(ammoRange)
    .where(and(eq(ammoRange.id, id), eq(ammoRange.userId, userId)));
  return rows[0] ?? null;
}
