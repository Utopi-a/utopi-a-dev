"use server";

import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { transactionInputSchema } from "@/features/ammo-ledger/schema/transaction-schema";
import { prepareConfirmedTransaction } from "@/features/ammo-ledger/transactions/prepare-confirmed-transaction/prepare-confirmed-transaction";

export async function createTransactionAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = transactionInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  if (parsed.data.inputKind === "stock_check") {
    return { ok: false as const, error: "棚卸しは残弾確認画面から行ってください" };
  }

  const preparedResult = await prepareConfirmedTransaction({
    userId: user.id,
    input: parsed.data,
  });

  if (!preparedResult.ok) {
    return { ok: false as const, error: preparedResult.error };
  }

  const {
    input: data,
    gunRow,
    rangeRow,
    counterparty,
    computedRounds,
    normalized,
  } = preparedResult.prepared;

  const transactionId = crypto.randomUUID();
  const ledgerEntryId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(ammoTransaction).values({
      id: transactionId,
      userId: user.id,
      status: "confirmed",
      inputKind: data.inputKind,
      purpose: data.purpose,
      occurredOn: data.occurredOn,
      ammoTypeId: preparedResult.prepared.ammoTypeRow.id,
      gunId: gunRow?.id ?? null,
      rangeId: rangeRow?.id ?? null,
      counterpartyId: counterparty?.counterpartyId ?? null,
      outerBoxCount: data.outerBoxCount,
      boxCount: data.boxCount,
      looseRounds: data.looseRounds,
      computedRounds,
      counterpartyName: counterparty?.name ?? null,
      counterpartyAddress: counterparty?.address ?? null,
      memo: data.memo ?? null,
    });

    await tx.insert(ammoLedgerEntry).values({
      id: ledgerEntryId,
      userId: user.id,
      transactionId,
      category: normalized.category,
      purpose: data.purpose,
      occurredOn: normalized.occurredOn,
      ammoTypeId: normalized.ammoTypeId,
      ammoTypeName: normalized.ammoTypeName,
      quantity: normalized.quantity,
      location: normalized.location,
      counterpartyName: normalized.counterpartyName,
      counterpartyAddress: normalized.counterpartyAddress,
      gunId: normalized.gunId,
      gunName: normalized.gunName,
      gunPermitNumber: normalized.gunPermitNumber,
    });
  });

  return {
    ok: true as const,
    redirectPath: `/lab/ammo-ledger/ledger?purpose=${data.purpose}`,
  };
}
