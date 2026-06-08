/** ISO 日付 (YYYY-MM-DD) を UI 表記 YYYY/MM/DD に変換する */
export function formatIsoDateForDisplay({ value }: { value: string }): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${year}/${month}/${day}`;
}
