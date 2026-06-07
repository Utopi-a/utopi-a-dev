import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";

export async function listRanges({ userId }: { userId: string }) {
  return db.select().from(ammoRange).where(eq(ammoRange.userId, userId)).orderBy(ammoRange.name);
}
