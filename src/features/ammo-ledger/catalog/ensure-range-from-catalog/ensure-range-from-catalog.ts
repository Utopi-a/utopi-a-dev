"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { getRangeCatalogEntry } from "@/features/ammo-ledger/catalog/load-range-catalog/load-range-catalog";

export async function ensureRangeFromCatalog({ catalogId }: { catalogId: string }) {
  const user = await requireAmmoUser();

  const [existing] = await db
    .select()
    .from(ammoRange)
    .where(and(eq(ammoRange.userId, user.id), eq(ammoRange.catalogId, catalogId)))
    .limit(1);

  if (existing) {
    return { ok: true as const, id: existing.id };
  }

  const entry = getRangeCatalogEntry({ catalogId });
  if (!entry) {
    return { ok: false as const, error: "射撃場が見つかりません" };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoRange).values({
    id,
    userId: user.id,
    catalogId,
    name: entry.name,
    address: entry.address,
    defaultPurpose: entry.defaultPurpose ?? null,
  });

  return { ok: true as const, id };
}
