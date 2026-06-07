export function normalizeRangeName({ name }: { name: string }): string {
  return name
    .normalize("NFKC")
    .replace(/[･・\s]/g, "")
    .replace(/[（(].*$/, "")
    .replace(
      /射撃場|クレー|クレ|ライフル|総合|国際|常設|研修センター|教習センター|研修ｾﾝﾀｰ|教習ｾﾝﾀｰ|営|支部|指定|協会/g,
      "",
    )
    .trim();
}

export function rangeNamesMatch({ left, right }: { left: string; right: string }): boolean {
  const normalizedLeft = normalizeRangeName({ name: left });
  const normalizedRight = normalizeRangeName({ name: right });

  if (normalizedLeft.length < 2 || normalizedRight.length < 2) {
    return false;
  }

  return normalizedRight.includes(normalizedLeft) || normalizedLeft.includes(normalizedRight);
}
