import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty, ammoGun, ammoRange, ammoType } from "@/db/schema/ammo-ledger";
import { ensureManualCounterparty } from "@/features/ammo-ledger/master/ensure-manual-counterparty/ensure-manual-counterparty";
import { resolveCounterparty } from "@/features/ammo-ledger/master/resolve-counterparty/resolve-counterparty";
import { hasActiveAcquisitionPermit } from "@/features/ammo-ledger/permit/has-active-acquisition-permit/has-active-acquisition-permit";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { LedgerTransactionInput } from "@/features/ammo-ledger/schema/transaction-schema";
import { isLedgerInputKind } from "@/features/ammo-ledger/schema/transaction-schema";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import type { NormalizedLedgerEntry } from "@/features/ammo-ledger/transactions/normalize-transaction/normalize-transaction";
import { normalizeTransaction } from "@/features/ammo-ledger/transactions/normalize-transaction/normalize-transaction";
import { validateLedgerEntry } from "@/features/ammo-ledger/transactions/validate-ledger-entry/validate-ledger-entry";

export type PreparedConfirmedTransaction = {
  input: LedgerTransactionInput;
  ammoTypeRow: typeof ammoType.$inferSelect;
  gunRow?: typeof ammoGun.$inferSelect;
  rangeRow?: typeof ammoRange.$inferSelect;
  counterparty: ReturnType<typeof resolveCounterparty>;
  computedRounds: number;
  normalized: NormalizedLedgerEntry;
};

export async function prepareConfirmedTransaction({
  userId,
  input,
}: {
  userId: string;
  input: LedgerTransactionInput;
}): Promise<{ ok: true; prepared: PreparedConfirmedTransaction } | { ok: false; error: string }> {
  if (!isLedgerInputKind(input.inputKind)) {
    return { ok: false, error: "この入力種別は保存できません" };
  }

  const [ammoTypeRow] = await db
    .select()
    .from(ammoType)
    .where(and(eq(ammoType.id, input.ammoTypeId), eq(ammoType.userId, userId)));

  if (!ammoTypeRow) {
    return { ok: false, error: "弾種が見つかりません" };
  }

  if (input.inputKind === "acquire") {
    const permits = await listAcquisitionPermits({ userId });
    if (
      !hasActiveAcquisitionPermit({
        permits,
        purpose: input.purpose,
        occurredOn: input.occurredOn,
      })
    ) {
      return {
        ok: false,
        error: `譲受日に有効な${ledgerPurposeLabels[input.purpose]}の譲受許可がありません`,
      };
    }
  }

  let gunRow: typeof ammoGun.$inferSelect | undefined;
  let rangeRow: typeof ammoRange.$inferSelect | undefined;

  if (input.inputKind === "consume") {
    const [gun] = await db
      .select()
      .from(ammoGun)
      .where(and(eq(ammoGun.id, input.gunId), eq(ammoGun.userId, userId)));

    if (!gun) {
      return { ok: false, error: "銃が見つかりません" };
    }
    gunRow = gun;

    if (input.purpose === "shooting") {
      const [range] = await db
        .select()
        .from(ammoRange)
        .where(and(eq(ammoRange.id, input.rangeId), eq(ammoRange.userId, userId)));

      if (!range) {
        return { ok: false, error: "射撃場が見つかりません" };
      }
      rangeRow = range;
    }
  }

  let counterpartyRow: typeof ammoCounterparty.$inferSelect | undefined;
  if ("counterpartyId" in input && input.counterpartyId) {
    const [row] = await db
      .select()
      .from(ammoCounterparty)
      .where(
        and(eq(ammoCounterparty.id, input.counterpartyId), eq(ammoCounterparty.userId, userId)),
      );
    counterpartyRow = row;
  } else if (
    "counterpartyName" in input &&
    input.counterpartyName &&
    "counterpartyAddress" in input &&
    input.counterpartyAddress
  ) {
    const ensured = await ensureManualCounterparty({
      userId,
      name: input.counterpartyName,
      address: input.counterpartyAddress,
    });
    const [row] = await db
      .select()
      .from(ammoCounterparty)
      .where(and(eq(ammoCounterparty.id, ensured.id), eq(ammoCounterparty.userId, userId)));
    counterpartyRow = row;
  }

  const counterparty =
    "counterpartyId" in input || "counterpartyName" in input
      ? resolveCounterparty({
          counterpartyName: "counterpartyName" in input ? input.counterpartyName : undefined,
          counterpartyAddress:
            "counterpartyAddress" in input ? input.counterpartyAddress : undefined,
          master: counterpartyRow ?? null,
        })
      : null;

  const counterpartyRequiredKinds = ["acquire", "transfer", "issue", "receive"] as const;
  if (
    counterpartyRequiredKinds.includes(
      input.inputKind as (typeof counterpartyRequiredKinds)[number],
    ) &&
    !counterparty
  ) {
    return { ok: false, error: "相手方を選択するか、氏名と住所を入力してください" };
  }

  const computedRounds = computeRounds({
    outerBoxCount: input.outerBoxCount,
    boxCount: input.boxCount,
    looseRounds: input.looseRounds,
    roundsPerBox: ammoTypeRow.roundsPerBox,
  });

  const locationFromInput =
    input.inputKind === "consume" &&
    (input.purpose === "hunting" || input.purpose === "pest_control")
      ? input.location
      : undefined;

  const normalized = normalizeTransaction({
    inputKind: input.inputKind,
    occurredOn: input.occurredOn,
    ammoTypeId: ammoTypeRow.id,
    ammoTypeName: ammoTypeRow.name,
    outerBoxCount: input.outerBoxCount,
    boxCount: input.boxCount,
    looseRounds: input.looseRounds,
    roundsPerBox: ammoTypeRow.roundsPerBox,
    gunId: gunRow?.id,
    gunName: gunRow?.name,
    gunNumber: gunRow?.gunNumber,
    gunPermitNumber: gunRow?.permitNumber,
    rangeId: rangeRow?.id,
    rangeName: rangeRow?.name,
    rangeAddress: rangeRow?.address,
    location: locationFromInput,
    counterpartyName: counterparty?.name,
    counterpartyAddress: counterparty?.address,
  });

  if (!normalized) {
    return { ok: false, error: "数量が0以下です" };
  }

  const validation = validateLedgerEntry(normalized);
  if (!validation.valid) {
    return {
      ok: false,
      error: `帳簿に出力できません: ${validation.missingFields.join("、")}`,
    };
  }

  return {
    ok: true,
    prepared: {
      input,
      ammoTypeRow,
      gunRow,
      rangeRow,
      counterparty,
      computedRounds,
      normalized,
    },
  };
}
