import {
  classifyLedgerEntryFlow,
  isCounterpartyCategory,
} from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export type LedgerEntryForValidation = {
  id: string;
  occurredOn: string;
  category: string;
  purpose: string;
  ammoTypeId: string | null;
  ammoTypeName: string;
  ammoCartridgeType: string | null;
  ammoCaliber: string | null;
  ammoGaugeNumber: string | null;
  quantity: number;
  location: string | null;
  gunPermitNumber: string | null;
  gunNumber: string | null;
  counterpartyName: string | null;
  counterpartyAddress: string | null;
  voidedAt: Date | null;
  dayOrder: number;
  createdAt: Date;
};

export type LedgerLockIssue = {
  entryId: string;
  occurredOn: string;
  message: string;
};

function buildAmmoTypeBalanceKey({ entry }: { entry: LedgerEntryForValidation }): string {
  if (entry.ammoTypeId) {
    return `id:${entry.ammoTypeId}`;
  }

  return [
    "snapshot",
    entry.ammoCartridgeType ?? "",
    entry.ammoCaliber ?? "",
    entry.ammoGaugeNumber ?? "",
    entry.ammoTypeName,
  ].join("\u001f");
}

function compareLedgerEntriesForValidation({
  a,
  b,
}: {
  a: LedgerEntryForValidation;
  b: LedgerEntryForValidation;
}): number {
  const dateCompare = a.occurredOn.localeCompare(b.occurredOn);
  if (dateCompare !== 0) return dateCompare;
  const dayOrderCompare = a.dayOrder - b.dayOrder;
  if (dayOrderCompare !== 0) return dayOrderCompare;
  const createdAtCompare = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdAtCompare !== 0) return createdAtCompare;
  return a.id.localeCompare(b.id);
}

export function validateLedgerForLock({
  entries,
  from,
  to,
}: {
  entries: LedgerEntryForValidation[];
  from: string;
  to: string;
}): LedgerLockIssue[] {
  const issues: LedgerLockIssue[] = [];

  const filtered = entries.filter(
    (e) => e.voidedAt === null && e.occurredOn >= from && e.occurredOn <= to,
  );

  const byPurpose = new Map<string, LedgerEntryForValidation[]>();
  for (const entry of filtered) {
    const list = byPurpose.get(entry.purpose);
    if (list) {
      list.push(entry);
    } else {
      byPurpose.set(entry.purpose, [entry]);
    }
  }

  for (const [, purposeEntries] of byPurpose) {
    const sorted = [...purposeEntries].sort((a, b) => compareLedgerEntriesForValidation({ a, b }));

    const balanceByType = new Map<string, number>();
    let totalBalance = 0;

    for (const entry of sorted) {
      const flow = classifyLedgerEntryFlow({
        category: entry.category,
        quantity: entry.quantity,
      });
      const absQuantity = Math.abs(entry.quantity);
      const delta = flow === "receive" ? absQuantity : -absQuantity;

      const typeKey = buildAmmoTypeBalanceKey({ entry });
      const prevTypeBalance = balanceByType.get(typeKey) ?? 0;
      const newTypeBalance = prevTypeBalance + delta;
      balanceByType.set(typeKey, newTypeBalance);

      totalBalance += delta;

      if (newTypeBalance < 0) {
        issues.push({
          entryId: entry.id,
          occurredOn: entry.occurredOn,
          message: `${entry.ammoTypeName} ${newTypeBalance}（種類別残が負）`,
        });
      }

      if (totalBalance < 0) {
        issues.push({
          entryId: entry.id,
          occurredOn: entry.occurredOn,
          message: `総残数 ${totalBalance}（総残が負）`,
        });
      }

      const category = entry.category as LedgerCategory;

      if (!entry.ammoCartridgeType || !entry.ammoCaliber) {
        issues.push({
          entryId: entry.id,
          occurredOn: entry.occurredOn,
          message: `実包種類情報が不足（種別または番径が未設定）`,
        });
      }

      if (category === "consume") {
        if (!entry.location) {
          issues.push({
            entryId: entry.id,
            occurredOn: entry.occurredOn,
            message: `消費記録に射撃場所が未設定`,
          });
        }
        if (!entry.gunPermitNumber && !entry.gunNumber) {
          issues.push({
            entryId: entry.id,
            occurredOn: entry.occurredOn,
            message: `消費記録に使用銃（許可番号または銃番号）が未設定`,
          });
        }
      }

      if (isCounterpartyCategory({ category })) {
        if (!entry.counterpartyName) {
          issues.push({
            entryId: entry.id,
            occurredOn: entry.occurredOn,
            message: `相手方名称が未設定`,
          });
        }
        if (!entry.counterpartyAddress) {
          issues.push({
            entryId: entry.id,
            occurredOn: entry.occurredOn,
            message: `相手方住所が未設定`,
          });
        }
      }
    }
  }

  return issues;
}
