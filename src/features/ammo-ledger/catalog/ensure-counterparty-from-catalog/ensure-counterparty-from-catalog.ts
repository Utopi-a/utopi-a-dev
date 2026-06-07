"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { getGunShopCatalogEntry } from "@/features/ammo-ledger/catalog/load-gun-shop-catalog/load-gun-shop-catalog";

export async function ensureCounterpartyFromCatalog({ catalogId }: { catalogId: string }) {
  const user = await requireAmmoUser();

  const [existing] = await db
    .select()
    .from(ammoCounterparty)
    .where(and(eq(ammoCounterparty.userId, user.id), eq(ammoCounterparty.catalogId, catalogId)))
    .limit(1);

  if (existing) {
    return { ok: true as const, id: existing.id };
  }

  const entry = getGunShopCatalogEntry({ catalogId });
  if (!entry) {
    return { ok: false as const, error: "銃砲店が見つかりません" };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoCounterparty).values({
    id,
    userId: user.id,
    catalogId,
    name: entry.name,
    address: entry.address,
    kind: entry.kind ?? "shop",
  });

  return { ok: true as const, id };
}
