import type { LedgerBodyRow } from "@/features/ammo-ledger/documents/build-ledger-body-rows/build-ledger-body-rows";
import { formatAmmoTypeLabel } from "@/features/ammo-ledger/documents/format-ammo-type-label/format-ammo-type-label";

function buildPrintCarryoverKey({ row }: { row: LedgerBodyRow }): string {
  return [
    row.entry.occurredOn,
    formatAmmoTypeLabel({
      snapshot: {
        ammoCartridgeType: row.entry.ammoCartridgeType,
        ammoCaliber: row.entry.ammoCaliber,
        ammoGaugeNumber: row.entry.ammoGaugeNumber,
        ammoTypeName: row.entry.ammoTypeName,
      },
    }),
  ].join("\u001f");
}

function mergeCarryoverGroup({ rows }: { rows: LedgerBodyRow[] }): LedgerBodyRow {
  const [first, ...rest] = rows;
  const quantity = rows.reduce((sum, row) => sum + Math.abs(row.entry.quantity), 0);

  if (rest.length === 0) {
    return first;
  }

  return {
    no: first.no,
    flow: "receive",
    entry: {
      ...first.entry,
      quantity,
    },
    balanceByType: quantity,
    totalBalance: first.totalBalance,
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

  let totalBalance = 0;
  return merged.map((row, index) => {
    const absQuantity = Math.abs(row.entry.quantity);
    const delta = row.flow === "receive" ? absQuantity : -absQuantity;
    totalBalance += delta;

    return {
      ...row,
      no: index + 1,
      totalBalance,
    };
  });
}
