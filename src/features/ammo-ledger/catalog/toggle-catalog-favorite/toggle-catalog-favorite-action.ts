"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ammoCatalogFavorite } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";
import { catalogKinds } from "@/features/ammo-ledger/catalog/schema/catalog-kind";

export async function toggleCatalogFavoriteAction({
  catalogKind,
  catalogId,
}: {
  catalogKind: CatalogKind;
  catalogId: string;
}) {
  if (!catalogKinds.includes(catalogKind)) {
    return { ok: false as const, error: "不正なカタログ種別です" };
  }

  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const [existing] = await db
    .select()
    .from(ammoCatalogFavorite)
    .where(
      and(
        eq(ammoCatalogFavorite.userId, user.id),
        eq(ammoCatalogFavorite.catalogKind, catalogKind),
        eq(ammoCatalogFavorite.catalogId, catalogId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(ammoCatalogFavorite).where(eq(ammoCatalogFavorite.id, existing.id));
    revalidatePickerPaths({ catalogKind });
    return { ok: true as const, isFavorite: false };
  }

  await db.insert(ammoCatalogFavorite).values({
    id: crypto.randomUUID(),
    userId: user.id,
    catalogKind,
    catalogId,
  });

  revalidatePickerPaths({ catalogKind });
  return { ok: true as const, isFavorite: true };
}

function revalidatePickerPaths({ catalogKind }: { catalogKind: CatalogKind }) {
  if (catalogKind === "range") {
    revalidatePath("/lab/ammo-ledger/settings/ranges");
    revalidatePath("/lab/ammo-ledger/settings/ranges/catalog");
    revalidatePath("/lab/ammo-ledger/consume/new");
    return;
  }

  revalidatePath("/lab/ammo-ledger/settings/counterparties");
  revalidatePath("/lab/ammo-ledger/settings/counterparties/catalog");
  revalidatePath("/lab/ammo-ledger/inflow/new");
}
