export function formatLedgerGunLabel({
  gunName,
  gunPermitNumber,
  gunNumber,
}: {
  gunName: string | null | undefined;
  gunPermitNumber?: string | null;
  gunNumber?: string | null;
}): string {
  const identifyingNumber = gunPermitNumber || gunNumber;

  if (!gunName) {
    return identifyingNumber ?? "";
  }

  return identifyingNumber ? `${gunName}（${identifyingNumber}）` : gunName;
}
