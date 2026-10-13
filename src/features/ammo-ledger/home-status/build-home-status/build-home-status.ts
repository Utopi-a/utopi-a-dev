import { buildLedgerHref } from "@/features/ammo-ledger/ledger/build-ledger-href/build-ledger-href";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import { computeDaysUntilExpiry } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import {
  computeCurrentPermitState,
  filterByPurpose,
} from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import { listUsablePermits } from "@/features/ammo-ledger/permit/list-usable-permits/list-usable-permits";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

const permitNoticeDays = 30;
const maxNotices = 3;

export type HomePermitSummary = {
  purpose: LedgerPurpose;
  /** 帳簿画面の「今日使える残り」と同じ値 */
  balance: number;
  /** 今日使える許可のうち最も近い有効期限 */
  nearestExpiresOn: string | null;
};

export type HomeNotice = {
  id: string;
  tone: "warning" | "info";
  message: string;
  href: string;
};

export type HomeStatus = {
  /** 帳簿画面の「帳簿残数（全用途）」と同じ値 */
  totalStock: number;
  permitSummaries: HomePermitSummary[];
  lockedThrough: string | null;
  notices: HomeNotice[];
};

type HomeStatusWorkspace = Pick<
  AmmoLedgerWorkspace,
  "entries" | "permits" | "permitEvents" | "inventoryItems" | "lockState"
>;

function computePurposePermitState({
  workspace,
  purpose,
  today,
}: {
  workspace: HomeStatusWorkspace;
  purpose: LedgerPurpose;
  today: string;
}) {
  return computeCurrentPermitState({
    permitEvents: filterByPurpose({ rows: workspace.permitEvents, purpose }).map((event) => ({
      ...event,
      eventKind: event.eventKind as PermitEventKind,
    })),
    ledgerEntries: filterByPurpose({ rows: workspace.entries, purpose }).map((entry) => ({
      ...entry,
      category: entry.category as LedgerCategory,
    })),
    today,
  });
}

function buildPermitStatus({
  workspace,
  today,
}: {
  workspace: HomeStatusWorkspace;
  today: string;
}): { permitSummaries: HomePermitSummary[]; permitNotices: HomeNotice[] } {
  const permitSummaries: HomePermitSummary[] = [];
  // 期限が近い順、続けて期限切れの新しい順に並べるための順位
  const rankedNotices: { rank: number; notice: HomeNotice }[] = [];

  for (const purpose of ledgerPurposes) {
    const purposePermits = workspace.permits.filter((permit) => permit.ledgerPurpose === purpose);
    const { balance, remainingByPermitId } = computePurposePermitState({
      workspace,
      purpose,
      today,
    });
    const usablePermits = listUsablePermits({
      permits: purposePermits,
      remainingByPermitId,
      today,
    });
    const href = buildLedgerHref({ purpose });

    if (balance > 0 || purposePermits.some((permit) => permit.expiresOn >= today)) {
      const nearestExpiresOn = usablePermits.map((permit) => permit.expiresOn).sort()[0] ?? null;
      permitSummaries.push({ purpose, balance, nearestExpiresOn });
    }

    for (const permit of purposePermits) {
      const subject = `${ledgerPurposeLabels[purpose]}の譲受許可（${permit.name}）`;
      const days = computeDaysUntilExpiry({ expiresOn: permit.expiresOn, today });
      if (usablePermits.includes(permit) && days <= permitNoticeDays) {
        const deadline = days === 0 ? "本日が有効期限です" : `有効期限まであと${days}日です`;
        rankedNotices.push({
          rank: days,
          notice: {
            id: `permit-expiring-${permit.id}`,
            tone: "warning",
            message: `${subject}は${deadline}。残り${remainingByPermitId.get(permit.id)}個。`,
            href,
          },
        });
      }
      if (days >= 0 || days < -permitNoticeDays) continue;
      // 失効した許可は今日の状態から消えるため、有効期限の当日時点の残りで使い切ったかを見る。
      const remainingAtExpiry =
        computePurposePermitState({
          workspace,
          purpose,
          today: permit.expiresOn,
        }).remainingByPermitId.get(permit.id) ?? 0;
      if (remainingAtExpiry <= 0) continue;
      rankedNotices.push({
        rank: permitNoticeDays - days,
        notice: {
          id: `permit-expired-${permit.id}`,
          tone: "warning",
          message: `${subject}は${formatIsoDateForDisplay({ value: permit.expiresOn })}で有効期限が切れました。使わなかった残り${remainingAtExpiry}個。`,
          href,
        },
      });
    }
  }

  return {
    permitSummaries,
    permitNotices: rankedNotices.sort((a, b) => a.rank - b.rank).map(({ notice }) => notice),
  };
}

export function buildHomeStatus({
  workspace,
  today,
}: {
  workspace: HomeStatusWorkspace;
  today: string;
}): HomeStatus {
  const { currentStock } = evaluateHomeStorageLimit({
    entries: workspace.entries.map((entry) => ({
      ...entry,
      category: entry.category as LedgerCategory,
    })),
  });
  const { permitSummaries, permitNotices } = buildPermitStatus({ workspace, today });
  const notices = [...permitNotices];

  const unconfirmedCount = workspace.inventoryItems.filter(
    (item) => item.ammoType.classificationConfirmedAt === null,
  ).length;
  if (unconfirmedCount > 0) {
    notices.push({
      id: "unconfirmed-ammo-types",
      tone: "info",
      message: `分類が未確認の弾種が${unconfirmedCount}件あります。`,
      href: "/lab/ammo-ledger/settings/ammo-types/review",
    });
  }

  const year = Number(today.slice(0, 4));
  const previousYearEnd = `${year - 1}-12-31`;
  const { lockedThrough } = workspace.lockState;
  if (
    Number(today.slice(5, 7)) <= 3 &&
    workspace.entries.some((entry) => entry.occurredOn <= previousYearEnd) &&
    (lockedThrough === null || lockedThrough < previousYearEnd)
  ) {
    notices.push({
      id: "previous-year-unlocked",
      tone: "info",
      message: `${year - 1}年の帳簿がまだ確定されていません。`,
      href: "/lab/ammo-ledger/settings/ledger-lock",
    });
  }

  return {
    totalStock: currentStock,
    permitSummaries,
    lockedThrough,
    notices: notices.slice(0, maxNotices),
  };
}
