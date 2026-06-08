export function formatLedgerGunLabel({
  gunName,
  gunNumber,
  gunPermitNumber,
}: {
  gunName: string | null | undefined;
  gunNumber?: string | null;
  gunPermitNumber?: string | null;
}): string {
  if (!gunName) {
    return "";
  }

  const details = [gunNumber, gunPermitNumber].filter(Boolean).join(" / ");
  return details ? `${gunName}（${details}）` : gunName;
}
