export const planPeriodParts = ["上旬", "中旬", "下旬"] as const;

export type PlanPeriodPart = (typeof planPeriodParts)[number];

export type PlanPeriod = {
  year: number;
  month: number;
  period: PlanPeriodPart;
};

export function comparePlanPeriod({ a, b }: { a: PlanPeriod; b: PlanPeriod }): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }

  return planPeriodParts.indexOf(a.period) - planPeriodParts.indexOf(b.period);
}

export function formatPlanPeriodLabel({ value }: { value: PlanPeriod }): string {
  return `${value.year}年${value.month}月${value.period}`;
}

export function listPlanPeriodsInRange({ from, to }: { from: string; to: string }): PlanPeriod[] {
  const start = parseYearMonth({ value: from });
  const end = parseYearMonth({ value: to });
  const periods: PlanPeriod[] = [];

  let cursor = { year: start.year, month: start.month };

  while (compareYearMonth({ a: cursor, b: end }) <= 0) {
    for (const period of planPeriodParts) {
      periods.push({ year: cursor.year, month: cursor.month, period });
    }
    cursor = nextYearMonth({ value: cursor });
  }

  return periods;
}

export function distributePlanPeriodsEvenly({
  from,
  to,
  count,
}: {
  from: string;
  to: string;
  count: number;
}): PlanPeriod[] {
  const allPeriods = listPlanPeriodsInRange({ from, to });

  if (count <= 0 || allPeriods.length === 0) {
    return [];
  }

  if (count === 1) {
    return [allPeriods[0]];
  }

  if (count >= allPeriods.length) {
    return allPeriods;
  }

  return Array.from({ length: count }, (_, index) => {
    const slotIndex = Math.round((index * (allPeriods.length - 1)) / (count - 1));
    return allPeriods[slotIndex];
  });
}

function parseYearMonth({ value }: { value: string }): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function compareYearMonth({
  a,
  b,
}: {
  a: { year: number; month: number };
  b: { year: number; month: number };
}): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  return a.month - b.month;
}

function nextYearMonth({ value }: { value: { year: number; month: number } }): {
  year: number;
  month: number;
} {
  if (value.month === 12) {
    return { year: value.year + 1, month: 1 };
  }
  return { year: value.year, month: value.month + 1 };
}
