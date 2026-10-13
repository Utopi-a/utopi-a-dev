import type { ammoType } from "@/db/schema/ammo-ledger";
import { resolvePurposeForAmmoType } from "@/features/ammo-ledger/components/purpose-select/use-purpose-following-ammo-type";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import type { LedgerTransactionInput } from "@/features/ammo-ledger/schema/transaction-schema";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";

export type BulkEntryRowKind = "consume" | "acquire";
export type ConsumptionLocationInputKind = "range" | "manual";

export type BulkEntryRowState = {
  clientId: string;
  inputKind: BulkEntryRowKind;
  occurredOn: string;
  purpose: LedgerPurpose;
  /** 利用者が用途を選んだか。選んだ後は弾を選び直しても用途を変えない */
  isPurposeChosen: boolean;
  ammoTypeId: string;
  outerBoxCount: string;
  boxCount: string;
  looseRounds: string;
  gunId: string;
  locationInputKind: ConsumptionLocationInputKind;
  rangeId: string;
  location: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyAddress: string;
};

export type BulkEntryCopyField =
  | "occurredOn"
  | "purpose"
  | "ammoTypeId"
  | "packaging"
  | "consumeLocation"
  | "gunId"
  | "counterparty";

/** 新しい行に引き継ぐ値。直前の行（なければ前回の消費）と同じ銃・弾・用途で始める */
export type BulkEntryRowCarryOver = Partial<
  Pick<
    BulkEntryRowState,
    "gunId" | "ammoTypeId" | "purpose" | "isPurposeChosen" | "locationInputKind"
  >
>;

export function createBulkEntryRow({
  inputKind,
  occurredOn,
  defaultCounterpartyId,
  carryOver,
}: {
  inputKind: BulkEntryRowKind;
  occurredOn: string;
  defaultCounterpartyId: string;
  carryOver?: BulkEntryRowCarryOver;
}): BulkEntryRowState {
  const purpose = carryOver?.purpose ?? "shooting";
  return {
    clientId: crypto.randomUUID(),
    inputKind,
    occurredOn,
    purpose,
    isPurposeChosen: carryOver?.isPurposeChosen ?? false,
    ammoTypeId: carryOver?.ammoTypeId ?? "",
    outerBoxCount: "",
    boxCount: "",
    looseRounds: "",
    gunId: carryOver?.gunId ?? "",
    locationInputKind:
      carryOver?.locationInputKind ?? (purpose === "shooting" ? "range" : "manual"),
    rangeId: "",
    location: "",
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
      return { ...target, purpose: source.purpose, isPurposeChosen: true };
    case "ammoTypeId":
      return { ...target, ammoTypeId: source.ammoTypeId };
    case "packaging":
      return {
        ...target,
        outerBoxCount: source.outerBoxCount,
        boxCount: source.boxCount,
        looseRounds: source.looseRounds,
      };
    case "consumeLocation":
      return {
        ...target,
        locationInputKind: source.locationInputKind,
        rangeId: source.rangeId,
        location: source.location,
      };
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
  const nextPurpose = resolvePurposeForAmmoType({
    purpose: row.purpose,
    isPurposeChosen: row.isPurposeChosen,
    ammoType: ammoTypes.find((type) => type.id === ammoTypeId),
  });
  return {
    ...row,
    ammoTypeId,
    purpose: nextPurpose,
    locationInputKind:
      nextPurpose === "shooting"
        ? "range"
        : row.purpose === "shooting"
          ? "manual"
          : row.locationInputKind,
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
    switch (row.purpose) {
      case "shooting":
        return {
          inputKind: "consume" as const,
          ...base,
          purpose: "shooting" as const,
          gunId: row.gunId,
          rangeId: row.rangeId,
        };
      case "hunting":
        return row.locationInputKind === "range"
          ? {
              inputKind: "consume" as const,
              ...base,
              purpose: "hunting" as const,
              gunId: row.gunId,
              rangeId: row.rangeId,
            }
          : {
              inputKind: "consume" as const,
              ...base,
              purpose: "hunting" as const,
              gunId: row.gunId,
              location: row.location,
            };
      case "pest_control":
        return row.locationInputKind === "range"
          ? {
              inputKind: "consume" as const,
              ...base,
              purpose: "pest_control" as const,
              gunId: row.gunId,
              rangeId: row.rangeId,
            }
          : {
              inputKind: "consume" as const,
              ...base,
              purpose: "pest_control" as const,
              gunId: row.gunId,
              location: row.location,
            };
      default: {
        const _exhaustive: never = row.purpose;
        return _exhaustive;
      }
    }
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
