import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";

export function defaultCarryoverExpiresOn({ year }: { year: number }): string {
  const openingDay = buildYearOpeningDay({ year });
  const date = new Date(`${openingDay}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}
