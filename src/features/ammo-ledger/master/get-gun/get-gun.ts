import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoGun } from "@/db/schema/ammo-ledger";

export async function getGun({ id, userId }: { id: string; userId: string }) {
  const rows = await db
    .select()
    .from(ammoGun)
    .where(and(eq(ammoGun.id, id), eq(ammoGun.userId, userId)));
  return rows[0] ?? null;
}
