export type PermitCarryoverDisplayRow = {
  kind: "permit_carryover";
  id: string;
  occurredOn: string;
  quantity: number;
  expiresOn: string | null;
  permitName: string;
  permitPurpose: string;
};

function buildMergeKey({
  occurredOn,
  permitName,
  permitPurpose,
}: {
  occurredOn: string;
  permitName: string;
  permitPurpose: string;
}): string {
  return `${occurredOn}\0${permitName}\0${permitPurpose}`;
}

function mergeExpiresOn({
  left,
  right,
}: {
  left: string | null;
  right: string | null;
}): string | null {
  if (left === right) {
    return left;
  }

  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return null;
}

export function mergePermitCarryoverDisplayRows({
  rows,
}: {
  rows: PermitCarryoverDisplayRow[];
}): PermitCarryoverDisplayRow[] {
  const mergedByKey = new Map<string, PermitCarryoverDisplayRow>();

  for (const row of rows) {
    const key = buildMergeKey({
      occurredOn: row.occurredOn,
      permitName: row.permitName,
      permitPurpose: row.permitPurpose,
    });
    const existing = mergedByKey.get(key);

    if (!existing) {
      mergedByKey.set(key, { ...row });
      continue;
    }

    existing.quantity += row.quantity;
    existing.expiresOn = mergeExpiresOn({
      left: existing.expiresOn,
      right: row.expiresOn,
    });
    existing.id = `permit-carryover-merged-${key}`;
  }

  return [...mergedByKey.values()];
}
