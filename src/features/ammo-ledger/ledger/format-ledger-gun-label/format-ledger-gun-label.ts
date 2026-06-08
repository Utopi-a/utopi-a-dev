export function formatLedgerGunLabel({
  gunName,
  gunPermitNumber,
}: {
  gunName: string | null | undefined;
  gunPermitNumber?: string | null;
}): string {
  if (!gunName) {
    return "";
  }

  return gunPermitNumber ? `${gunName}（${gunPermitNumber}）` : gunName;
}
