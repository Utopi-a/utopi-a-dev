/** 9号と9.5号をまとめた選択肢・表示用の値 */
export const shotGaugeCombinedNine = "9・9.5" as const;

/** 狩猟・駆除など（10号を除く標準号数。9・9.5は統合） */
export const shotGaugeOptionsGeneral = [
  "00B",
  "BB",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "7.5",
  "8",
  shotGaugeCombinedNine,
] as const;

/** 射撃用のみ */
export const shotGaugeOptionsShooting = ["7.5", shotGaugeCombinedNine] as const;

export type ShotGaugeOptionGeneral = (typeof shotGaugeOptionsGeneral)[number];
export type ShotGaugeOptionShooting = (typeof shotGaugeOptionsShooting)[number];

export type ShotGaugeSelectOption = {
  value: string;
  label: string;
};

export function listShotGaugeSelectOptions({
  defaultPurpose,
}: {
  defaultPurpose?: string | null;
} = {}): ShotGaugeSelectOption[] {
  const gauges = defaultPurpose === "shooting" ? shotGaugeOptionsShooting : shotGaugeOptionsGeneral;

  return gauges.map((gauge) => ({
    value: gauge,
    label: `${gauge}号`,
  }));
}

export function isShotGaugeAllowed({
  gaugeNumber,
  defaultPurpose,
}: {
  gaugeNumber: string;
  defaultPurpose?: string | null;
}): boolean {
  const allowed = listShotGaugeSelectOptions({ defaultPurpose }).map((option) => option.value);
  return allowed.includes(gaugeNumber);
}

export function normalizeGaugeNumberForSelect({
  gaugeNumber,
}: {
  gaugeNumber?: string | null;
}): string {
  const formatted = formatGaugeNumberForDisplay({ gaugeNumber });
  return formatted ?? "";
}

export function formatGaugeNumberForDisplay({
  gaugeNumber,
}: {
  gaugeNumber?: string | null;
}): string | null {
  if (!gaugeNumber?.trim()) {
    return null;
  }
  const trimmed = gaugeNumber.trim();
  if (trimmed === "9" || trimmed === "9.5") {
    return shotGaugeCombinedNine;
  }
  return trimmed;
}
