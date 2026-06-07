import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type LedgerPrintSectionKey = {
  permitName: string;
  permitPurpose: string;
  ledgerPurpose: LedgerPurpose;
};

export function buildLedgerPrintSectionKey({
  permitName,
  permitPurpose,
  ledgerPurpose,
}: LedgerPrintSectionKey): string {
  return `${permitName}\0${permitPurpose}\0${ledgerPurpose}`;
}

export function parseLedgerPrintSectionKey({ key }: { key: string }): LedgerPrintSectionKey {
  const [permitName, permitPurpose, ledgerPurpose] = key.split("\0");
  return {
    permitName,
    permitPurpose,
    ledgerPurpose: ledgerPurpose as LedgerPurpose,
  };
}
