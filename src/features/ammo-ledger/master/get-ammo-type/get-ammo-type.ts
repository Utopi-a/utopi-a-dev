import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoType } from "@/db/schema/ammo-ledger";

export async function getAmmoType({ id, userId }: { id: string; userId: string }) {
  const rows = await db
    .select()
    .from(ammoType)
    .where(and(eq(ammoType.id, id), eq(ammoType.userId, userId)));
  return rows[0] ?? null;
}
