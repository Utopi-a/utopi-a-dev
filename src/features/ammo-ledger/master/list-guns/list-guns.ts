import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoGun } from "@/db/schema/ammo-ledger";

export async function listGuns({ userId }: { userId: string }) {
  return db.select().from(ammoGun).where(eq(ammoGun.userId, userId)).orderBy(ammoGun.name);
}
