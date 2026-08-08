import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

type AcquisitionPermitPeriod = {
  ledgerPurpose: string;
  grantedOn: string;
  expiresOn: string;
};

export function hasActiveAcquisitionPermit({
  permits,
  purpose,
  occurredOn,
}: {
  permits: AcquisitionPermitPeriod[];
  purpose: LedgerPurpose;
  occurredOn: string;
}): boolean {
  return permits.some(
    (permit) =>
      permit.ledgerPurpose === purpose &&
      permit.grantedOn <= occurredOn &&
      occurredOn <= permit.expiresOn,
  );
}
