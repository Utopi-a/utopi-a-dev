const PREFECTURE_SUFFIX_MAP: Record<string, string> = {
  京都: "京都府",
  大阪: "大阪府",
};

export function normalizePrefecture({ prefecture }: { prefecture: string }): string {
  if (
    prefecture === "北海道" ||
    prefecture.endsWith("県") ||
    prefecture.endsWith("府") ||
    prefecture.endsWith("道")
  ) {
    return prefecture;
  }

  return PREFECTURE_SUFFIX_MAP[prefecture] ?? `${prefecture}県`;
}
