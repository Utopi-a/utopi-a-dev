import { type LedgerPurpose, ledgerPurposes } from "./ledger-purpose";

export function resolveDefaultPurpose({
  defaultPurpose,
}: {
  defaultPurpose?: string | null;
}): LedgerPurpose {
  if (defaultPurpose && ledgerPurposes.includes(defaultPurpose as LedgerPurpose)) {
    return defaultPurpose as LedgerPurpose;
  }
  return "shooting";
}

export function parseLedgerPurpose({ value }: { value?: string | null }): LedgerPurpose | null {
  if (!value) {
    return null;
  }
  if (ledgerPurposes.includes(value as LedgerPurpose)) {
    return value as LedgerPurpose;
  }
  return null;
}
