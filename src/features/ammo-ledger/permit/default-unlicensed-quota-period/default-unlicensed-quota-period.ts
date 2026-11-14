import type { UnlicensedAcquisitionPurpose } from "@/features/ammo-ledger/schema/unlicensed-acquisition-quota-schema";
import { computePeriodEndIsoDate } from "@/lib/date/compute-period-end-iso-date";

/**
 * 無許可譲受の枠を登録するときの有効期間の初期値。
 * 狩猟者登録は10月15日から翌年4月15日まで（鳥獣保護管理法55条2項）なので、今日を含む猟期の期間にする。
 * 北海道（9月15日から）や10月16日以後の登録、捕獲許可の期間は人によって違うため、画面で直してもらう。
 */
export function defaultUnlicensedQuotaPeriod({
  purpose,
  today,
}: {
  purpose: UnlicensedAcquisitionPurpose;
  today: string;
}): { startsOn: string; endsOn: string } {
  if (purpose === "pest_control") {
    return { startsOn: today, endsOn: computePeriodEndIsoDate({ startsOn: today, years: 1 }) };
  }

  const year = Number(today.slice(0, 4));
  // 4月15日までは前年に始まった猟期の中にいる。
  const seasonStartYear = today.slice(5) <= "04-15" ? year - 1 : year;
  return { startsOn: `${seasonStartYear}-10-15`, endsOn: `${seasonStartYear + 1}-04-15` };
}
