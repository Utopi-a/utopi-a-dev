import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";
import { mapInputKindToCategory } from "@/features/ammo-ledger/schema/input-kind";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";

export type NormalizedLedgerEntry = {
  category: LedgerCategory;
  occurredOn: string;
  ammoTypeId: string;
  ammoTypeName: string;
  quantity: number;
  location: string | null;
  counterpartyName: string | null;
  counterpartyAddress: string | null;
  gunId: string | null;
  gunName: string | null;
  gunNumber: string | null;
  gunPermitNumber: string | null;
};

type NormalizeTransactionInput = {
  inputKind: InputKind;
  occurredOn: string;
  ammoTypeId: string;
  ammoTypeName: string;
  outerBoxCount?: number;
  boxCount: number;
  looseRounds: number;
  roundsPerBox: number;
  gunId?: string;
  gunName?: string;
  gunNumber?: string;
  gunPermitNumber?: string;
  rangeId?: string;
  rangeName?: string;
  rangeAddress?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
};

export function normalizeTransaction(
  input: NormalizeTransactionInput,
): NormalizedLedgerEntry | null {
  const category = mapInputKindToCategory({ inputKind: input.inputKind });
  if (!category) {
    return null;
  }

  const quantity = computeRounds({
    outerBoxCount: input.outerBoxCount ?? 0,
    boxCount: input.boxCount,
    looseRounds: input.looseRounds,
    roundsPerBox: input.roundsPerBox,
  });

  if (quantity <= 0) {
    return null;
  }

  const location =
    input.rangeName && input.rangeAddress
      ? `${input.rangeName} ${input.rangeAddress}`
      : (input.rangeName ?? input.rangeAddress ?? null);

  return {
    category,
    occurredOn: input.occurredOn,
    ammoTypeId: input.ammoTypeId,
    ammoTypeName: input.ammoTypeName,
    quantity,
    location,
    counterpartyName: input.counterpartyName ?? null,
    counterpartyAddress: input.counterpartyAddress ?? null,
    gunId: input.gunId ?? null,
    gunName: input.gunName ?? null,
    gunNumber: input.gunNumber ?? null,
    gunPermitNumber: input.gunPermitNumber ?? null,
  };
}
