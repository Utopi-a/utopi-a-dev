import type { ammoType } from "@/db/schema/ammo-ledger";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import type { LedgerTransactionInput } from "@/features/ammo-ledger/schema/transaction-schema";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";

export type BulkEntryRowKind = "consume" | "acquire";

export type BulkEntryRowState = {
  clientId: string;
  inputKind: BulkEntryRowKind;
  occurredOn: string;
  purpose: LedgerPurpose;
  ammoTypeId: string;
  outerBoxCount: string;
  boxCount: string;
  looseRounds: string;
  gunId: string;
  rangeId: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyAddress: string;
};

export type BulkEntryCopyField =
  | "occurredOn"
  | "purpose"
  | "ammoTypeId"
  | "packaging"
  | "rangeId"
  | "gunId"
  | "counterparty";

export function createBulkEntryRow({
  inputKind,
  occurredOn,
  defaultCounterpartyId,
}: {
  inputKind: BulkEntryRowKind;
  occurredOn: string;
  defaultCounterpartyId: string;
}): BulkEntryRowState {
  return {
    clientId: crypto.randomUUID(),
    inputKind,
    occurredOn,
    purpose: "shooting",
    ammoTypeId: "",
    outerBoxCount: "",
    boxCount: "",
    looseRounds: "",
    gunId: "",
    rangeId: "",
    counterpartyId: defaultCounterpartyId,
    counterpartyName: "",
    counterpartyAddress: "",
  };
}

export function copyBulkEntryField({
  source,
  target,
  field,
}: {
  source: BulkEntryRowState;
  target: BulkEntryRowState;
  field: BulkEntryCopyField;
}): BulkEntryRowState {
  switch (field) {
    case "occurredOn":
      return { ...target, occurredOn: source.occurredOn };
    case "purpose":
      return { ...target, purpose: source.purpose };
    case "ammoTypeId":
      return { ...target, ammoTypeId: source.ammoTypeId };
    case "packaging":
      return {
        ...target,
        outerBoxCount: source.outerBoxCount,
        boxCount: source.boxCount,
        looseRounds: source.looseRounds,
      };
    case "rangeId":
      return { ...target, rangeId: source.rangeId };
    case "gunId":
      return { ...target, gunId: source.gunId };
    case "counterparty":
      return {
        ...target,
        counterpartyId: source.counterpartyId,
        counterpartyName: source.counterpartyName,
        counterpartyAddress: source.counterpartyAddress,
      };
  }
}

export function duplicateBulkEntryRow({
  source,
}: {
  source: BulkEntryRowState;
}): BulkEntryRowState {
  return {
    ...source,
    clientId: crypto.randomUUID(),
  };
}

export function applyAmmoTypeToRow({
  row,
  ammoTypeId,
  ammoTypes,
}: {
  row: BulkEntryRowState;
  ammoTypeId: string;
  ammoTypes: (typeof ammoType.$inferSelect)[];
}): BulkEntryRowState {
  const nextType = ammoTypes.find((type) => type.id === ammoTypeId);
  return {
    ...row,
    ammoTypeId,
    purpose: nextType
      ? resolveDefaultPurpose({ defaultPurpose: nextType.defaultPurpose })
      : row.purpose,
  };
}

export function hasBulkEntryPackaging({ row }: { row: BulkEntryRowState }): boolean {
  const outerBoxCount = Number(row.outerBoxCount) || 0;
  const boxCount = Number(row.boxCount) || 0;
  const looseRounds = Number(row.looseRounds) || 0;
  return outerBoxCount > 0 || boxCount > 0 || looseRounds !== 0;
}

export function computeBulkEntryRounds({
  row,
  ammoTypes,
}: {
  row: BulkEntryRowState;
  ammoTypes: (typeof ammoType.$inferSelect)[];
}): number {
  const ammoType = ammoTypes.find((type) => type.id === row.ammoTypeId);
  if (!ammoType) {
    return 0;
  }

  return computeRounds({
    outerBoxCount: Number(row.outerBoxCount) || 0,
    boxCount: Number(row.boxCount) || 0,
    looseRounds: Number(row.looseRounds) || 0,
    roundsPerBox: ammoType.roundsPerBox,
  });
}

export function buildBulkEntryPayload({
  row,
}: {
  row: BulkEntryRowState;
}): LedgerTransactionInput | null {
  if (!hasBulkEntryPackaging({ row })) {
    return null;
  }

  const outerBoxCount = Number(row.outerBoxCount) || 0;
  const boxCount = Number(row.boxCount) || 0;
  const looseRounds = Number(row.looseRounds) || 0;

  const base = {
    purpose: row.purpose,
    occurredOn: row.occurredOn,
    ammoTypeId: row.ammoTypeId,
    outerBoxCount,
    boxCount,
    looseRounds,
  };

  if (row.inputKind === "consume") {
    return {
      inputKind: "consume",
      ...base,
      gunId: row.gunId,
      rangeId: row.rangeId,
    };
  }

  if (row.counterpartyId === manualCounterpartyId) {
    return {
      inputKind: "acquire",
      ...base,
      counterpartyName: row.counterpartyName,
      counterpartyAddress: row.counterpartyAddress,
    };
  }

  return {
    inputKind: "acquire",
    ...base,
    counterpartyId: row.counterpartyId,
  };
}
