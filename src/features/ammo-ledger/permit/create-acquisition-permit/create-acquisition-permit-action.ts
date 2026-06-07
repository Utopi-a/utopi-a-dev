"use server";

import { db } from "@/db";
import { ammoAcquisitionPermit, ammoPermitEvent } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquisitionPermitInputSchema } from "@/features/ammo-ledger/schema/acquisition-permit-schema";

export async function createAcquisitionPermitAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = acquisitionPermitInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const data = parsed.data;
  const permitId = crypto.randomUUID();
  const grantEventId = crypto.randomUUID();
  const expiryEventId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(ammoAcquisitionPermit).values({
      id: permitId,
      userId: user.id,
      ledgerPurpose: data.ledgerPurpose,
      name: data.name,
      permitPurpose: data.permitPurpose,
      grantedOn: data.grantedOn,
      expiresOn: data.expiresOn,
      quantity: data.quantity,
      memo: data.memo ?? null,
    });

    await tx.insert(ammoPermitEvent).values({
      id: grantEventId,
      userId: user.id,
      permitId,
      purpose: data.ledgerPurpose,
      eventKind: "grant",
      occurredOn: data.grantedOn,
      quantity: data.quantity,
      memo: data.memo ?? null,
    });

    await tx.insert(ammoPermitEvent).values({
      id: expiryEventId,
      userId: user.id,
      permitId,
      purpose: data.ledgerPurpose,
      eventKind: "expiry",
      occurredOn: data.expiresOn,
      quantity: 0,
      memo: "許可有効期限",
    });
  });

  return { ok: true as const };
}
