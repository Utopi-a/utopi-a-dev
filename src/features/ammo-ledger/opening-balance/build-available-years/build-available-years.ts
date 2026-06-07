export function buildAvailableYears({
  dates,
  currentYear = new Date().getFullYear(),
}: {
  dates: string[];
  currentYear?: number;
}): number[] {
  const years = new Set<number>([currentYear]);

  for (const date of dates) {
    const year = Number(date.slice(0, 4));
    if (Number.isFinite(year) && year > 1900 && year <= currentYear) {
      years.add(year);
    }
  }

  return [...years].sort((a, b) => b - a);
}

export function buildYearDateRange({ year }: { year: number }): { from: string; to: string } {
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}
