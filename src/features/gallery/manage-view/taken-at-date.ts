function padNumber({ value, length }: { value: number; length: number }) {
  return String(value).padStart(length, "0");
}

/** 撮影日時（ISO）を、この端末の現地時刻での日付として `type="date"` の値にする。 */
export function takenAtToDateInputValue({ takenAt }: { takenAt: string | null }): string {
  if (!takenAt) {
    return "";
  }
  const date = new Date(takenAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return [
    padNumber({ value: date.getFullYear(), length: 4 }),
    padNumber({ value: date.getMonth() + 1, length: 2 }),
    padNumber({ value: date.getDate(), length: 2 }),
  ].join("-");
}

/**
 * 日付だけを差し替えた撮影日時（ISO）を返す。
 * 時刻は元のものを現地時刻のまま保ち、元が無ければ日付の境目でずれにくい 12:00 にする。
 */
export function replaceTakenAtDate({
  takenAt,
  date,
}: {
  takenAt: string | null;
  date: string;
}): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const original = takenAt ? new Date(takenAt) : null;
  const hasTime = original !== null && !Number.isNaN(original.getTime());
  const replaced = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hasTime ? original.getHours() : 12,
    hasTime ? original.getMinutes() : 0,
    hasTime ? original.getSeconds() : 0,
    hasTime ? original.getMilliseconds() : 0,
  );
  return replaced.toISOString();
}
