export function formatLedgerPrintPermitPurposeLabel({
  permitPurpose,
}: {
  permitPurpose: string;
}): string {
  if (permitPurpose === "狩猟（鳥獣の捕獲）") {
    return "狩猟";
  }

  return permitPurpose;
}
