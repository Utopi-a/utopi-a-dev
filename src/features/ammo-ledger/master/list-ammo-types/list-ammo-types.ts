import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoType } from "@/db/schema/ammo-ledger";

export async function listAmmoTypes({ userId }: { userId: string }) {
  return db.select().from(ammoType).where(eq(ammoType.userId, userId)).orderBy(ammoType.name);
}
