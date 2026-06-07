"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
  ammoType,
} from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import { mapLedgerPurposeToPermitPurpose } from "@/features/ammo-ledger/opening-balance/map-ledger-purpose-to-permit-purpose/map-ledger-purpose-to-permit-purpose";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { openingBalanceInputSchema } from "@/features/ammo-ledger/schema/opening-balance-schema";

type SaveOpeningBalanceTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function deleteCarryoverPermit({
  tx,
  existingPermitEvent,
}: {
  tx: SaveOpeningBalanceTx;
  existingPermitEvent: typeof ammoPermitEvent.$inferSelect;
}) {
  if (existingPermitEvent.permitId) {
    await tx
      .delete(ammoAcquisitionPermit)
      .where(eq(ammoAcquisitionPermit.id, existingPermitEvent.permitId));
    return;
  }

  await tx.delete(ammoPermitEvent).where(eq(ammoPermitEvent.id, existingPermitEvent.id));
}

async function upsertCarryoverPermit({
  tx,
  userId,
  year,
  purpose,
  openingDay,
  permitBalance,
  permitExpiresOn,
  existingPermitEvent,
}: {
  tx: SaveOpeningBalanceTx;
  userId: string;
  year: number;
  purpose: LedgerPurpose;
  openingDay: string;
  permitBalance: number;
  permitExpiresOn: string;
  existingPermitEvent: typeof ammoPermitEvent.$inferSelect | null;
}) {
  const memo = `${year}年の許可残数繰越`;
  const now = new Date();

  if (existingPermitEvent?.permitId) {
    const permitId = existingPermitEvent.permitId;

    await tx
      .update(ammoAcquisitionPermit)
      .set({
        quantity: permitBalance,
        expiresOn: permitExpiresOn,
        updatedAt: now,
      })
      .where(eq(ammoAcquisitionPermit.id, permitId));

    await tx
      .update(ammoPermitEvent)
      .set({
        quantity: permitBalance,
        updatedAt: now,
      })
      .where(eq(ammoPermitEvent.id, existingPermitEvent.id));

    const [existingExpiryEvent] = await tx
      .select()
      .from(ammoPermitEvent)
      .where(and(eq(ammoPermitEvent.permitId, permitId), eq(ammoPermitEvent.eventKind, "expiry")));

    if (existingExpiryEvent) {
      await tx
        .update(ammoPermitEvent)
        .set({
          occurredOn: permitExpiresOn,
          updatedAt: now,
        })
        .where(eq(ammoPermitEvent.id, existingExpiryEvent.id));
      return;
    }

    await tx.insert(ammoPermitEvent).values({
      id: crypto.randomUUID(),
      userId,
      permitId,
      purpose,
      eventKind: "expiry",
      occurredOn: permitExpiresOn,
      quantity: 0,
      memo: "許可有効期限",
    });
    return;
  }

  const permitId = crypto.randomUUID();

  await tx.insert(ammoAcquisitionPermit).values({
    id: permitId,
    userId,
    ledgerPurpose: purpose,
    name: "その他",
    permitPurpose: mapLedgerPurposeToPermitPurpose({ purpose }),
    grantedOn: openingDay,
    expiresOn: permitExpiresOn,
    quantity: permitBalance,
    memo,
  });

  if (existingPermitEvent) {
    await tx
      .update(ammoPermitEvent)
      .set({
        permitId,
        quantity: permitBalance,
        updatedAt: now,
      })
      .where(eq(ammoPermitEvent.id, existingPermitEvent.id));
  } else {
    await tx.insert(ammoPermitEvent).values({
      id: crypto.randomUUID(),
      userId,
      permitId,
      purpose,
      eventKind: "carryover",
      occurredOn: openingDay,
      quantity: permitBalance,
      memo,
    });
  }

  await tx.insert(ammoPermitEvent).values({
    id: crypto.randomUUID(),
    userId,
    permitId,
    purpose,
    eventKind: "expiry",
    occurredOn: permitExpiresOn,
    quantity: 0,
    memo: "許可有効期限",
  });
}

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

  const { year, purpose, permitBalance, permitExpiresOn, stockByAmmoType } = parsed.data;
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
      await upsertCarryoverPermit({
        tx,
        userId: user.id,
        year,
        purpose,
        openingDay,
        permitBalance,
        permitExpiresOn: permitExpiresOn as string,
        existingPermitEvent,
      });
    } else if (existingPermitEvent) {
      await deleteCarryoverPermit({ tx, existingPermitEvent });
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
            gunNumber: null,
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
