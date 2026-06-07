"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoPermitEvent, ammoType } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import { openingBalanceInputSchema } from "@/features/ammo-ledger/schema/opening-balance-schema";

export async function saveOpeningBalanceAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = openingBalanceInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const { year, purpose, permitBalance, stockByAmmoType } = parsed.data;
  const openingDay = buildYearOpeningDay({ year });

  const [ammoTypes, existingPermitEvents, existingStockEntries] = await Promise.all([
    db.select().from(ammoType).where(eq(ammoType.userId, user.id)),
    db
      .select()
      .from(ammoPermitEvent)
      .where(
        and(
          eq(ammoPermitEvent.userId, user.id),
          eq(ammoPermitEvent.purpose, purpose),
          eq(ammoPermitEvent.eventKind, "carryover"),
          eq(ammoPermitEvent.occurredOn, openingDay),
        ),
      ),
    db
      .select()
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.userId, user.id),
          eq(ammoLedgerEntry.purpose, purpose),
          eq(ammoLedgerEntry.category, "carryover"),
          eq(ammoLedgerEntry.occurredOn, openingDay),
          isNull(ammoLedgerEntry.voidedAt),
        ),
      ),
  ]);

  const ammoTypeById = new Map(ammoTypes.map((type) => [type.id, type]));
  const existingPermitEvent = existingPermitEvents[0] ?? null;
  const existingStockByAmmoTypeId = new Map(
    existingStockEntries
      .filter((entry) => entry.ammoTypeId !== null)
      .map((entry) => [entry.ammoTypeId as string, entry]),
  );

  for (const ammoTypeId of Object.keys(stockByAmmoType)) {
    if (!ammoTypeById.has(ammoTypeId)) {
      return { ok: false as const, error: "未登録の弾種が含まれています" };
    }
  }

  await db.transaction(async (tx) => {
    if (permitBalance && permitBalance > 0) {
      if (existingPermitEvent) {
        await tx
          .update(ammoPermitEvent)
          .set({ quantity: permitBalance, updatedAt: new Date() })
          .where(eq(ammoPermitEvent.id, existingPermitEvent.id));
      } else {
        await tx.insert(ammoPermitEvent).values({
          id: crypto.randomUUID(),
          userId: user.id,
          permitId: null,
          purpose,
          eventKind: "carryover",
          occurredOn: openingDay,
          quantity: permitBalance,
          memo: `${year}年の許可残数繰越`,
        });
      }
    } else if (existingPermitEvent) {
      await tx.delete(ammoPermitEvent).where(eq(ammoPermitEvent.id, existingPermitEvent.id));
    }

    const ammoTypeIds = new Set([
      ...Object.keys(stockByAmmoType),
      ...existingStockByAmmoTypeId.keys(),
    ]);

    for (const ammoTypeId of ammoTypeIds) {
      const quantity = stockByAmmoType[ammoTypeId] ?? 0;
      const existingEntry = existingStockByAmmoTypeId.get(ammoTypeId);
      const ammoTypeRow = ammoTypeById.get(ammoTypeId);

      if (!ammoTypeRow) {
        continue;
      }

      if (quantity > 0) {
        if (existingEntry) {
          await tx
            .update(ammoLedgerEntry)
            .set({
              quantity,
              ammoTypeName: ammoTypeRow.name,
              updatedAt: new Date(),
            })
            .where(eq(ammoLedgerEntry.id, existingEntry.id));
        } else {
          await tx.insert(ammoLedgerEntry).values({
            id: crypto.randomUUID(),
            userId: user.id,
            transactionId: null,
            category: "carryover",
            purpose,
            occurredOn: openingDay,
            ammoTypeId: ammoTypeRow.id,
            ammoTypeName: ammoTypeRow.name,
            quantity,
            location: null,
            counterpartyName: null,
            counterpartyAddress: null,
            gunId: null,
            gunName: null,
            gunPermitNumber: null,
          });
        }
        continue;
      }

      if (existingEntry) {
        await tx
          .update(ammoLedgerEntry)
          .set({ voidedAt: new Date(), updatedAt: new Date() })
          .where(eq(ammoLedgerEntry.id, existingEntry.id));
      }
    }
  });

  return { ok: true as const };
}
