import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import { computePeriodEndIsoDate } from "@/lib/date/compute-period-end-iso-date";

/** 1月1日に繰り越した許可を、そこから1年の有効期間（同じ年の12月31日まで）として仮置きする。 */
export function defaultCarryoverExpiresOn({ year }: { year: number }): string {
  return computePeriodEndIsoDate({ startsOn: buildYearOpeningDay({ year }), years: 1 });
}
