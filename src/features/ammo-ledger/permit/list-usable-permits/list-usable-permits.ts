import { resolvePermitStatus } from "@/features/ammo-ledger/permit/resolve-permit-status/resolve-permit-status";

type PermitPeriod = {
  id: string;
  grantedOn: string;
  expiresOn: string;
};

/** 今日が有効期間内で、残りを使い切っていない許可。remainingByPermitId は computeCurrentPermitState の値 */
export function listUsablePermits<T extends PermitPeriod>({
  permits,
  remainingByPermitId,
  today,
}: {
  permits: T[];
  remainingByPermitId: ReadonlyMap<string | null, number>;
  today: string;
}): T[] {
  return permits.filter(
    (permit) =>
      resolvePermitStatus({
        grantedOn: permit.grantedOn,
        expiresOn: permit.expiresOn,
        remaining: remainingByPermitId.get(permit.id) ?? 0,
        today,
      }) === "active",
  );
}
