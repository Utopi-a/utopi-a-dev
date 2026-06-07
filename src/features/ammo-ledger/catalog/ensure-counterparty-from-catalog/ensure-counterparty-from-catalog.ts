"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { getGunShopCatalogEntry } from "@/features/ammo-ledger/catalog/load-gun-shop-catalog/load-gun-shop-catalog";
import { getRangeCatalogEntry } from "@/features/ammo-ledger/catalog/load-range-catalog/load-range-catalog";

export async function ensureCounterpartyFromCatalog({ catalogId }: { catalogId: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const [existing] = await db
    .select()
    .from(ammoCounterparty)
    .where(and(eq(ammoCounterparty.userId, user.id), eq(ammoCounterparty.catalogId, catalogId)))
    .limit(1);

  if (existing) {
    return { ok: true as const, id: existing.id };
  }

  const gunShopEntry = getGunShopCatalogEntry({ catalogId });
  const rangeEntry = gunShopEntry ? undefined : getRangeCatalogEntry({ catalogId });
  const entry = gunShopEntry ?? rangeEntry;
  if (!entry) {
    return { ok: false as const, error: "購入先が見つかりません" };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoCounterparty).values({
    id,
    userId: user.id,
    catalogId,
    name: entry.name,
    address: entry.address,
    kind: gunShopEntry ? (gunShopEntry.kind ?? "shop") : "range",
  });

  return { ok: true as const, id };
}
