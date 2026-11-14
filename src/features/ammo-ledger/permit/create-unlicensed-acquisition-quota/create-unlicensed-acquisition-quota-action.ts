"use server";

import { db } from "@/db";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { mapLedgerPurposeToPermitPurpose } from "@/features/ammo-ledger/opening-balance/map-ledger-purpose-to-permit-purpose/map-ledger-purpose-to-permit-purpose";
import { insertAcquisitionPermit } from "@/features/ammo-ledger/permit/insert-acquisition-permit/insert-acquisition-permit";
import {
  unlicensedAcquisitionPermitName,
  unlicensedAcquisitionQuotaInputSchema,
  unlicensedAcquisitionRoundLimit,
} from "@/features/ammo-ledger/schema/unlicensed-acquisition-quota-schema";

/**
 * 狩猟者登録・捕獲許可の有効期間を、無許可譲受の枠として登録する。
 * 譲受許可と同じ表に入れることで、譲受の保存可否と残数の計算を譲受許可と同じ仕組みで扱う。
 */
export async function createUnlicensedAcquisitionQuotaAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = unlicensedAcquisitionQuotaInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const { ledgerPurpose, startsOn, endsOn, memo } = parsed.data;

  await db.transaction(async (tx) => {
    await insertAcquisitionPermit({
      tx,
      userId: user.id,
      permit: {
        kind: "unlicensed",
        ledgerPurpose,
        name: unlicensedAcquisitionPermitName,
        permitPurpose: mapLedgerPurposeToPermitPurpose({ purpose: ledgerPurpose }),
        grantedOn: startsOn,
        expiresOn: endsOn,
        quantity: unlicensedAcquisitionRoundLimit,
        memo,
      },
    });
  });

  return { ok: true as const };
}
