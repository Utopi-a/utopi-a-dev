export function buildYearOpeningDay({ year }: { year: number }): string {
  return `${year}-01-01`;
}

export function parseYearFromDate({ date }: { date: string }): number {
  return Number(date.slice(0, 4));
}
