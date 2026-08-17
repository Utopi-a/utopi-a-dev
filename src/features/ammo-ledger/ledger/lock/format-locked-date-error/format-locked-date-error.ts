export function formatLockedDateError({ lockedThrough }: { lockedThrough: string }): string {
  const [yearStr, monthStr, dayStr] = lockedThrough.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  return `${year}年${month}月${day}日までの帳簿はロックされています`;
}
