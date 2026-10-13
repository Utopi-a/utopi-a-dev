import { checkDatesAgainstLock } from "@/features/ammo-ledger/ledger/lock/check-dates-against-lock/check-dates-against-lock";
import { formatLockedDateError } from "@/features/ammo-ledger/ledger/lock/format-locked-date-error/format-locked-date-error";
import type { StockShortage } from "@/features/ammo-ledger/ledger/validate-stock-timeline/validate-stock-timeline";
import { hasActiveAcquisitionPermit } from "@/features/ammo-ledger/permit/has-active-acquisition-permit/has-active-acquisition-permit";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  futureOccurredOnError,
  isFutureOccurredOn,
} from "@/features/ammo-ledger/schema/transaction-schema";
import { checkLedgerChangesAgainstStock } from "@/features/ammo-ledger/transactions/check-ledger-changes-against-stock/check-ledger-changes-against-stock";
import { normalizeTransaction } from "@/features/ammo-ledger/transactions/normalize-transaction/normalize-transaction";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import type { LedgerEntryRow } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

export type LedgerTransactionPayload = {
  inputKind: Exclude<InputKind, "stock_check">;
  purpose: LedgerPurpose;
  occurredOn: string;
  ammoTypeId: string;
  outerBoxCount?: number;
  boxCount: number;
  looseRounds: number;
  gunId?: string;
  rangeId?: string;
  location?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
  memo?: string;
  ledgerNote?: string;
};

/** ID だけを送る射撃場・相手方の、帳簿に載る名称と住所 */
export type LedgerTransactionDisplay = {
  rangeName?: string;
  rangeAddress?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
};

function resolveNextDayOrder({
  entries,
  occurredOn,
}: {
  entries: LedgerEntryRow[];
  occurredOn: string;
}): number {
  return (
    entries
      .filter((entry) => entry.occurredOn === occurredOn)
      .reduce((max, entry) => Math.max(max, entry.dayOrder), -1) + 1
  );
}

/**
 * 保存前に、サーバーと同じ条件（未来日・ロック・譲受許可・時系列の在庫）を画面のデータで確かめ、
 * 帳簿に先行表示する行を組み立てる。最終的な判定と保存はサーバーで行う。
 */
export function prepareOptimisticLedgerEntry({
  workspace,
  payload,
  display = {},
  ledgerEntryId,
  provisionalId,
  now,
}: {
  workspace: AmmoLedgerWorkspace;
  payload: LedgerTransactionPayload;
  display?: LedgerTransactionDisplay;
  ledgerEntryId?: string;
  provisionalId: string;
  now: Date;
}): { ok: true; entry: LedgerEntryRow } | { ok: false; error: string; shortage?: StockShortage } {
  const ammoType = workspace.inventoryItems.find(
    (item) => item.ammoType.id === payload.ammoTypeId,
  )?.ammoType;
  if (!ammoType) {
    return { ok: false, error: "弾種が見つかりません。設定で弾種を確認してください" };
  }

  const currentEntry = ledgerEntryId
    ? workspace.entries.find((entry) => entry.id === ledgerEntryId)
    : undefined;
  if (ledgerEntryId && !currentEntry) {
    return { ok: false, error: "記録が見つかりません。帳簿を開き直してください" };
  }

  if (isFutureOccurredOn({ occurredOn: payload.occurredOn, now })) {
    return { ok: false, error: futureOccurredOnError };
  }

  const lockCheck = checkDatesAgainstLock({
    lockState: workspace.lockState,
    dates: currentEntry ? [currentEntry.occurredOn, payload.occurredOn] : [payload.occurredOn],
  });
  if (lockCheck.blocked) {
    return { ok: false, error: formatLockedDateError({ lockedThrough: lockCheck.lockedThrough }) };
  }

  if (
    payload.inputKind === "acquire" &&
    !hasActiveAcquisitionPermit({
      permits: workspace.permits,
      purpose: payload.purpose,
      occurredOn: payload.occurredOn,
    })
  ) {
    return {
      ok: false,
      error: `譲受日に有効な${ledgerPurposeLabels[payload.purpose]}の譲受許可がありません`,
    };
  }

  const gun = payload.gunId ? workspace.guns.find((item) => item.id === payload.gunId) : undefined;
  const normalized = normalizeTransaction({
    inputKind: payload.inputKind,
    occurredOn: payload.occurredOn,
    ammoTypeId: ammoType.id,
    ammoTypeName: ammoType.name,
    outerBoxCount: payload.outerBoxCount,
    boxCount: payload.boxCount,
    looseRounds: payload.looseRounds,
    roundsPerBox: ammoType.roundsPerBox,
    gunId: gun?.id,
    gunName: gun?.name,
    gunNumber: gun?.gunNumber,
    gunPermitNumber: gun?.permitNumber,
    rangeName: display.rangeName,
    rangeAddress: display.rangeAddress,
    location: payload.location,
    counterpartyName: display.counterpartyName ?? payload.counterpartyName,
    counterpartyAddress: display.counterpartyAddress ?? payload.counterpartyAddress,
  });
  if (!normalized) {
    return { ok: false, error: "数量を1発以上にしてください" };
  }

  const entry: LedgerEntryRow = {
    id: currentEntry?.id ?? provisionalId,
    userId: currentEntry?.userId ?? "",
    transactionId: currentEntry?.transactionId ?? null,
    category: normalized.category,
    purpose: payload.purpose,
    occurredOn: normalized.occurredOn,
    ammoTypeId: normalized.ammoTypeId,
    ammoTypeName: normalized.ammoTypeName,
    ammoCartridgeType: ammoType.cartridgeType,
    ammoCaliber: ammoType.caliber,
    ammoGaugeNumber: ammoType.gaugeNumber,
    quantity: normalized.quantity,
    location: normalized.location,
    ledgerNote: payload.ledgerNote ?? null,
    counterpartyName: normalized.counterpartyName,
    counterpartyAddress: normalized.counterpartyAddress,
    gunId: normalized.gunId,
    gunName: normalized.gunName,
    gunNumber: normalized.gunNumber,
    gunPermitNumber: normalized.gunPermitNumber,
    voidedAt: null,
    // 編集時の並び順・作成日時はサーバーと同じく元の行を引き継ぐ。
    dayOrder:
      currentEntry?.dayOrder ??
      resolveNextDayOrder({ entries: workspace.entries, occurredOn: normalized.occurredOn }),
    createdAt: currentEntry?.createdAt ?? now,
    updatedAt: now,
  };

  const stockCheck = checkLedgerChangesAgainstStock({
    entries: workspace.entries,
    changes: { upserted: [entry], removedIds: [] },
  });
  if (!stockCheck.ok) {
    return stockCheck;
  }

  return { ok: true, entry };
}
