import type { PlanPeriod } from "../plan-period/plan-period";

/** 各区間あたり最大1回から始め、必要なら同一区間に2回目以降を割り当てる */
export function resolveMaxSlotsPerPeriod({
  periodCount,
  eventCount,
  initialMax = 1,
}: {
  periodCount: number;
  eventCount: number;
  initialMax?: number;
}): number {
  if (periodCount <= 0 || eventCount <= 0) {
    return initialMax;
  }

  let maxSlots = initialMax;
  while (periodCount * maxSlots < eventCount) {
    maxSlots += 1;
  }
  return maxSlots;
}

export function buildBalancedPeriodSlots({
  periods,
  slotCount,
  maxSlotsPerPeriod,
}: {
  periods: PlanPeriod[];
  slotCount: number;
  maxSlotsPerPeriod: number;
}): PlanPeriod[] {
  if (periods.length === 0 || slotCount <= 0) {
    return [];
  }

  const slotsPerPeriod = periods.map(() => 0);
  let assigned = 0;
  let cursor = 0;
  let safety = 0;

  while (assigned < slotCount && safety < slotCount * periods.length + periods.length) {
    if (slotsPerPeriod[cursor] < maxSlotsPerPeriod) {
      slotsPerPeriod[cursor] += 1;
      assigned += 1;
    }
    cursor = (cursor + 1) % periods.length;
    safety += 1;
  }

  return periods.flatMap((period, index) =>
    Array.from({ length: slotsPerPeriod[index] }, () => period),
  );
}
