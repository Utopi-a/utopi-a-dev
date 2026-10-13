import { isPermitActive } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";

export type PermitStatus = "active" | "upcoming" | "used_up" | "expired";

/**
 * 今日時点の許可の状態。remaining は computeCurrentPermitState の remainingByPermitId の値で、
 * 有効期間中でも残りがなければ使い切りとする。
 */
export function resolvePermitStatus({
  grantedOn,
  expiresOn,
  remaining,
  today,
}: {
  grantedOn: string;
  expiresOn: string;
  remaining: number;
  today: string;
}): PermitStatus {
  if (today < grantedOn) {
    return "upcoming";
  }
  if (!isPermitActive({ grantedOn, expiresOn, today })) {
    return "expired";
  }
  return remaining > 0 ? "active" : "used_up";
}
