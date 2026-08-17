import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoType } from "@/db/schema/ammo-ledger";

export async function listUnconfirmedAmmoTypes({ userId }: { userId: string }) {
  return db
    .select({
      id: ammoType.id,
      name: ammoType.name,
      caliber: ammoType.caliber,
      cartridgeType: ammoType.cartridgeType,
      gaugeNumber: ammoType.gaugeNumber,
      roundsPerBox: ammoType.roundsPerBox,
    })
    .from(ammoType)
    .where(and(eq(ammoType.userId, userId), isNull(ammoType.classificationConfirmedAt)))
    .orderBy(ammoType.name);
}

export type UnconfirmedAmmoType = Awaited<ReturnType<typeof listUnconfirmedAmmoTypes>>[number];
