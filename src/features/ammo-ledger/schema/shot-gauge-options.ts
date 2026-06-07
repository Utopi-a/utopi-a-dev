/** 散弾の標準号数（クレー・狩猟で一般的なもの） */
export const shotGaugeOptions = [
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
  "9",
  "10",
] as const;

export type ShotGaugeOption = (typeof shotGaugeOptions)[number];
