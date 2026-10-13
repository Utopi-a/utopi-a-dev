import {
  classifyLedgerEntryFlow,
  isCounterpartyCategory,
} from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";
import { formatAmmoTypeLabel } from "@/features/ammo-ledger/documents/format-ammo-type-label/format-ammo-type-label";
import { buildOpeningBalanceHref } from "@/features/ammo-ledger/opening-balance/build-opening-balance-href/build-opening-balance-href";
import { parseYearFromDate } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import { computePriorYearEndStock } from "@/features/ammo-ledger/opening-balance/compute-prior-year-end-stock/compute-prior-year-end-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { buildLedgerEntryRedirectPath } from "@/features/ammo-ledger/transactions/build-ledger-entry-redirect-path/build-ledger-entry-redirect-path";

export type LedgerEntryForValidation = {
  id: string;
  occurredOn: string;
  category: string;
  purpose: string;
  ammoTypeId: string | null;
  ammoTypeName: string;
  ammoCartridgeType: string | null;
  ammoCaliber: string | null;
  ammoGaugeNumber: string | null;
  quantity: number;
  location: string | null;
  gunPermitNumber: string | null;
  gunNumber: string | null;
  counterpartyName: string | null;
  counterpartyAddress: string | null;
  voidedAt: Date | null;
  dayOrder: number;
  createdAt: Date;
};

export type LedgerLockIssueKind =
  | "unconfirmed_classification"
  | "missing_carryover"
  | "negative_type_balance"
  | "negative_total_balance"
  | "missing_entry_detail";

export type LedgerLockIssue = {
  kind: LedgerLockIssueKind;
  /** 弾種分類の確認のように用途によらない問題は null */
  purpose: LedgerPurpose | null;
  /** 記録ごとの問題だけが持つ */
  entryId: string | null;
  occurredOn: string;
  message: string;
  /** 問題を直す画面 */
  href: string;
};

export const ammoTypeClassificationReviewHref = "/lab/ammo-ledger/settings/ammo-types/review";

function compareLedgerEntriesForValidation({
  a,
  b,
}: {
  a: LedgerEntryForValidation;
  b: LedgerEntryForValidation;
}): number {
  const dateCompare = a.occurredOn.localeCompare(b.occurredOn);
  if (dateCompare !== 0) return dateCompare;
  const dayOrderCompare = a.dayOrder - b.dayOrder;
  if (dayOrderCompare !== 0) return dayOrderCompare;
  const createdAtCompare = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdAtCompare !== 0) return createdAtCompare;
  return a.id.localeCompare(b.id);
}

export function validateLedgerForLock({
  entries,
  from,
  to,
  unconfirmedAmmoTypeCount = 0,
}: {
  /** from より前の記録は、前年末の帳簿残数から年初繰越の未登録を見つけるためだけに使う。 */
  entries: LedgerEntryForValidation[];
  /** 対象年の1月1日 */
  from: string;
  to: string;
  unconfirmedAmmoTypeCount?: number;
}): LedgerLockIssue[] {
  const issues: LedgerLockIssue[] = [];

  if (unconfirmedAmmoTypeCount > 0) {
    issues.push({
      kind: "unconfirmed_classification",
      purpose: null,
      entryId: null,
      occurredOn: to,
      message: `未確認の弾種が${unconfirmedAmmoTypeCount}件あります`,
      href: ammoTypeClassificationReviewHref,
    });
  }

  const activeEntries = entries.filter((e) => e.voidedAt === null);
  const priorYearEndStock = computePriorYearEndStock({
    entries: activeEntries.map((e) => ({ ...e, category: e.category as LedgerCategory })),
    year: parseYearFromDate({ date: from }),
  });
  const filtered = activeEntries.filter((e) => e.occurredOn >= from && e.occurredOn <= to);

  // その年に記録がない用途も、前年末に残数があれば年初繰越の未登録を知らせる。
  const byPurpose = new Map<string, LedgerEntryForValidation[]>(
    Object.keys(priorYearEndStock).map((purpose) => [purpose, []]),
  );
  for (const entry of filtered) {
    const list = byPurpose.get(entry.purpose);
    if (list) {
      list.push(entry);
    } else {
      byPurpose.set(entry.purpose, [entry]);
    }
  }

  for (const [purposeKey, purposeEntries] of byPurpose) {
    const purpose = purposeKey as LedgerPurpose;
    const sorted = [...purposeEntries].sort((a, b) => compareLedgerEntriesForValidation({ a, b }));

    // 帳票は年ごとに残数0から数えるため、前年末に残数があるのに年初繰越がないと以降の残数がずれる。
    const priorYearEndTotal = Object.values(priorYearEndStock[purpose] ?? {}).reduce(
      (sum, quantity) => sum + Math.max(quantity, 0),
      0,
    );
    const hasOpeningCarryover = sorted.some(
      (entry) => entry.category === "carryover" && entry.occurredOn === from,
    );
    if (!hasOpeningCarryover && priorYearEndTotal > 0) {
      issues.push({
        kind: "missing_carryover",
        purpose,
        entryId: null,
        occurredOn: from,
        message: `${parseYearFromDate({ date: from })}年の年初繰越が未登録です（前年末の帳簿残数 ${priorYearEndTotal}個）`,
        href: buildOpeningBalanceHref({ occurredOn: from, purpose }),
      });
    }

    const balanceByType = new Map<string, number>();
    let totalBalance = 0;
    // 一度負になると以降の行もすべて負になるため、最初の1件だけを示す。
    const reportedNegativeTypes = new Set<string>();
    let reportedNegativeTotal = false;

    for (const entry of sorted) {
      const pushEntryIssue = ({
        kind,
        message,
      }: {
        kind: LedgerLockIssueKind;
        message: string;
      }) => {
        issues.push({
          kind,
          purpose,
          entryId: entry.id,
          occurredOn: entry.occurredOn,
          message,
          href: buildLedgerEntryRedirectPath({ purpose, ledgerEntryId: entry.id }),
        });
      };
      const flow = classifyLedgerEntryFlow({
        category: entry.category,
        quantity: entry.quantity,
      });
      const absQuantity = Math.abs(entry.quantity);
      const delta = flow === "receive" ? absQuantity : -absQuantity;

      // 印刷する帳票と同じ単位（印字する実包種類）で残数の負を検査する。
      const typeKey = formatAmmoTypeLabel({ snapshot: entry });
      const prevTypeBalance = balanceByType.get(typeKey) ?? 0;
      const newTypeBalance = prevTypeBalance + delta;
      balanceByType.set(typeKey, newTypeBalance);

      totalBalance += delta;

      if (newTypeBalance < 0 && !reportedNegativeTypes.has(typeKey)) {
        reportedNegativeTypes.add(typeKey);
        pushEntryIssue({
          kind: "negative_type_balance",
          message: `${typeKey}の種類別残が${newTypeBalance}個になります`,
        });
      }

      if (totalBalance < 0 && !reportedNegativeTotal) {
        reportedNegativeTotal = true;
        pushEntryIssue({
          kind: "negative_total_balance",
          message: `総残数が${totalBalance}個になります`,
        });
      }

      const category = entry.category as LedgerCategory;

      if (!entry.ammoCartridgeType || !entry.ammoCaliber) {
        pushEntryIssue({
          kind: "missing_entry_detail",
          message: `実包種類情報が不足（種別または番径が未設定）`,
        });
      }

      if (category === "consume") {
        if (!entry.location) {
          pushEntryIssue({
            kind: "missing_entry_detail",
            message: `消費記録に射撃場所が未設定`,
          });
        }
        if (!entry.gunPermitNumber && !entry.gunNumber) {
          pushEntryIssue({
            kind: "missing_entry_detail",
            message: `消費記録に使用銃（許可番号または銃番号）が未設定`,
          });
        }
      }

      if (isCounterpartyCategory({ category })) {
        if (!entry.counterpartyName) {
          pushEntryIssue({
            kind: "missing_entry_detail",
            message: `相手方名称が未設定`,
          });
        }
        if (!entry.counterpartyAddress) {
          pushEntryIssue({
            kind: "missing_entry_detail",
            message: `相手方住所が未設定`,
          });
        }
      }
    }
  }

  return issues;
}
