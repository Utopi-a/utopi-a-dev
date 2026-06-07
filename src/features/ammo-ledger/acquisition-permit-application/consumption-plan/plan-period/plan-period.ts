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
  const start = parseDate({ value: from });
  const end = parseDate({ value: to });
  const periods: PlanPeriod[] = [];

  let cursor = { year: start.year, month: start.month };

  while (compareYearMonth({ a: cursor, b: end }) <= 0) {
    for (const period of planPeriodParts) {
      const candidate = { year: cursor.year, month: cursor.month, period };
      if (isPlanPeriodWithinRange({ period: candidate, from, to })) {
        periods.push(candidate);
      }
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

export function isPlanPeriodWithinRange({
  period,
  from,
  to,
}: {
  period: PlanPeriod;
  from: string;
  to: string;
}): boolean {
  const representativeDay = planPeriodRepresentativeDay({ period: period.period });
  const candidate = new Date(period.year, period.month - 1, representativeDay);
  const fromDate = parseDateToLocalDate({ value: from });
  const toDate = parseDateToLocalDate({ value: to });

  return candidate >= fromDate && candidate <= toDate;
}

export function serializePlanPeriodKey({ period }: { period: PlanPeriod }): string {
  return `${period.year}-${period.month}-${period.period}`;
}

/** 許可期間の上旬/中旬/下旬1枠あたりの消費上限（25発単位切り捨て） */
export function computeMaxConsumptionPerPlanPeriod({
  requestedQuantity,
  periodFrom,
  periodTo,
  consumptionUnit = 25,
}: {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  consumptionUnit?: number;
}): number {
  const periodCount = listPlanPeriodsInRange({ from: periodFrom, to: periodTo }).length;
  if (periodCount <= 0) {
    return 0;
  }

  return Math.floor(requestedQuantity / periodCount / consumptionUnit) * consumptionUnit;
}

function planPeriodRepresentativeDay({ period }: { period: PlanPeriodPart }): number {
  if (period === "上旬") {
    return 5;
  }
  if (period === "中旬") {
    return 15;
  }
  return 25;
}

function parseDate({ value }: { value: string }): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function parseDateToLocalDate({ value }: { value: string }): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
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
