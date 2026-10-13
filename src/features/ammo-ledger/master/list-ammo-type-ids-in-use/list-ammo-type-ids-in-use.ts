import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";

/** 削除できない弾種の ID。deleteAmmoTypeAction と同じく、取消済みを含む帳簿行と取引の参照を見る。 */
export async function listAmmoTypeIdsInUse({ userId }: { userId: string }): Promise<Set<string>> {
  const [ledgerRows, transactionRows] = await Promise.all([
    db
      .selectDistinct({ ammoTypeId: ammoLedgerEntry.ammoTypeId })
      .from(ammoLedgerEntry)
      .where(and(eq(ammoLedgerEntry.userId, userId), isNotNull(ammoLedgerEntry.ammoTypeId))),
    db
      .selectDistinct({ ammoTypeId: ammoTransaction.ammoTypeId })
      .from(ammoTransaction)
      .where(and(eq(ammoTransaction.userId, userId), isNotNull(ammoTransaction.ammoTypeId))),
  ]);

  return new Set(
    [...ledgerRows, ...transactionRows].flatMap((row) => (row.ammoTypeId ? [row.ammoTypeId] : [])),
  );
}
