import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCatalogFavorite } from "@/db/schema/ammo-ledger";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";

export async function listCatalogFavoriteIds({
  userId,
  catalogKind,
}: {
  userId: string;
  catalogKind: CatalogKind;
}): Promise<string[]> {
  const rows = await db
    .select({ catalogId: ammoCatalogFavorite.catalogId })
    .from(ammoCatalogFavorite)
    .where(
      and(eq(ammoCatalogFavorite.userId, userId), eq(ammoCatalogFavorite.catalogKind, catalogKind)),
    );

  return rows.map((row) => row.catalogId);
}
