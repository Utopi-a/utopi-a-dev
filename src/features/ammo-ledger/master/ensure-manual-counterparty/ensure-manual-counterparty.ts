import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import type { CounterpartyKind } from "@/features/ammo-ledger/schema/counterparty-schema";

export async function ensureManualCounterparty({
  userId,
  name,
  address,
  kind = "shop",
}: {
  userId: string;
  name: string;
  address: string;
  kind?: CounterpartyKind;
}): Promise<{ ok: true; id: string }> {
  const [existing] = await db
    .select()
    .from(ammoCounterparty)
    .where(
      and(
        eq(ammoCounterparty.userId, userId),
        eq(ammoCounterparty.name, name),
        eq(ammoCounterparty.address, address),
        isNull(ammoCounterparty.catalogId),
      ),
    )
    .limit(1);

  if (existing) {
    return { ok: true, id: existing.id };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoCounterparty).values({
    id,
    userId,
    name,
    address,
    kind,
  });

  return { ok: true, id };
}
