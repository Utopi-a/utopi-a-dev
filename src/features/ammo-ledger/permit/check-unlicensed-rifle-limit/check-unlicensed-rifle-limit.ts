import { hasActiveAcquisitionPermit } from "@/features/ammo-ledger/permit/has-active-acquisition-permit/has-active-acquisition-permit";
import { isUnlicensedAcquisitionPermit } from "@/features/ammo-ledger/schema/acquisition-permit-kind";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { unlicensedAcquisitionRifleRoundLimit } from "@/features/ammo-ledger/schema/unlicensed-acquisition-quota-schema";

type PermitPeriod = {
  kind: string;
  ledgerPurpose: string;
  grantedOn: string;
  expiresOn: string;
};

type AcquireEntry = {
  id: string;
  purpose: string;
  category: string;
  occurredOn: string;
  quantity: number;
  ammoCartridgeType: string | null;
};

export type UnlicensedRifleUsage = {
  /** この記録を除いた、枠の期間中に無許可で譲り受けたライフル実包の数 */
  usedRounds: number;
  /** この記録を足した後の数 */
  roundsAfterEntry: number;
  limit: number;
};

/**
 * 無許可譲受のライフル実包の上限（枠の期間につき50個）に対する使用数。
 * 譲受許可も使える日の譲受は、どちらで譲り受けたか帳簿から分からないため数えない。
 * この記録自体が許可で譲り受けられる日や、ライフル実包でない記録には null を返す。
 */
export function checkUnlicensedRifleLimit({
  permits,
  entries,
  purpose,
  occurredOn,
  cartridgeType,
  rounds,
  excludedEntryId,
}: {
  permits: PermitPeriod[];
  entries: AcquireEntry[];
  purpose: LedgerPurpose;
  occurredOn: string;
  cartridgeType: string | undefined;
  rounds: number;
  excludedEntryId?: string;
}): UnlicensedRifleUsage | null {
  if (cartridgeType !== "rifle") {
    return null;
  }

  const licensedPermits = permits.filter((permit) => !isUnlicensedAcquisitionPermit(permit));
  const isLicensedOn = (date: string) =>
    hasActiveAcquisitionPermit({ permits: licensedPermits, purpose, occurredOn: date });

  const quota = permits.find(
    (permit) =>
      isUnlicensedAcquisitionPermit(permit) &&
      hasActiveAcquisitionPermit({ permits: [permit], purpose, occurredOn }),
  );
  if (!quota || isLicensedOn(occurredOn)) {
    return null;
  }

  const usedRounds = entries
    .filter(
      (entry) =>
        entry.id !== excludedEntryId &&
        entry.purpose === purpose &&
        entry.category === "acquire" &&
        entry.ammoCartridgeType === "rifle" &&
        quota.grantedOn <= entry.occurredOn &&
        entry.occurredOn <= quota.expiresOn &&
        !isLicensedOn(entry.occurredOn),
    )
    .reduce((sum, entry) => sum + entry.quantity, 0);

  return {
    usedRounds,
    roundsAfterEntry: usedRounds + rounds,
    limit: unlicensedAcquisitionRifleRoundLimit,
  };
}
