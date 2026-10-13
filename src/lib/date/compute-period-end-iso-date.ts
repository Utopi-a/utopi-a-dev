/**
 * startsOn から years 年間の期間の末日（その日を含む最終日）を YYYY-MM-DD で返す。
 * 民法143条に合わせ、起算日に応当する日の前日を末日とする（2/29 起算なら応当日がないため 2/28）。
 * 端末のタイムゾーンで日付がずれないよう、UTC の暦だけで計算する。
 */
export function computePeriodEndIsoDate({
  startsOn,
  years,
}: {
  startsOn: string;
  years: number;
}): string {
  const [year, month, day] = startsOn.split("-").map(Number);
  return new Date(Date.UTC(year + years, month - 1, day - 1)).toISOString().slice(0, 10);
}
