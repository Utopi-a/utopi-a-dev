import type { LedgerBodyRow } from "@/features/ammo-ledger/documents/build-ledger-body-rows/build-ledger-body-rows";
import { formatAmmoTypeLabel } from "@/features/ammo-ledger/documents/format-ammo-type-label/format-ammo-type-label";

function buildPrintCarryoverKey({ row }: { row: LedgerBodyRow }): string {
  return [row.entry.occurredOn, formatAmmoTypeLabel({ snapshot: row.entry })].join("\u001f");
}

function mergeCarryoverGroup({ rows }: { rows: LedgerBodyRow[] }): LedgerBodyRow {
  const [first, ...rest] = rows;
  const quantity = rows.reduce((sum, row) => sum + Math.abs(row.entry.quantity), 0);

  if (rest.length === 0) {
    return first;
  }

  // 残数は合算後にまとめて数え直すので、ここでは数量だけを合わせる。
  return {
    ...first,
    flow: "receive",
    entry: {
      ...first.entry,
      quantity,
    },
  };
}

export function mergePrintCarryoverRows({ rows }: { rows: LedgerBodyRow[] }): LedgerBodyRow[] {
  const groups = new Map<string, LedgerBodyRow[]>();

  for (const row of rows) {
    if (row.entry.category !== "carryover") {
      continue;
    }

    const key = buildPrintCarryoverKey({ row });
    const group = groups.get(key);
    if (group) {
      group.push(row);
      continue;
    }
    groups.set(key, [row]);
  }

  const merged: LedgerBodyRow[] = [];
  const emittedKeys = new Set<string>();

  for (const row of rows) {
    if (row.entry.category !== "carryover") {
      merged.push(row);
      continue;
    }

    const key = buildPrintCarryoverKey({ row });
    if (emittedKeys.has(key)) {
      continue;
    }

    emittedKeys.add(key);
    merged.push(mergeCarryoverGroup({ rows: groups.get(key) ?? [row] }));
  }

  // 合算で行の数量が変わるため、種類別残と総残数を印字する順に数え直す。
  const balanceByType = new Map<string, number>();
  let totalBalance = 0;
  return merged.map((row, index) => {
    const absQuantity = Math.abs(row.entry.quantity);
    const delta = row.flow === "receive" ? absQuantity : -absQuantity;
    const typeKey = formatAmmoTypeLabel({ snapshot: row.entry });
    const nextTypeBalance = (balanceByType.get(typeKey) ?? 0) + delta;
    balanceByType.set(typeKey, nextTypeBalance);
    totalBalance += delta;

    return {
      ...row,
      no: index + 1,
      balanceByType: nextTypeBalance,
      totalBalance,
    };
  });
}
