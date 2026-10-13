import {
  compareLedgerEntries,
  type LedgerEntrySortKey,
} from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import { isPermitEventOnOrBeforeToday } from "@/features/ammo-ledger/permit/is-permit-event-on-or-before-today/is-permit-event-on-or-before-today";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";

type PermitEventRow = {
  id: string;
  permitId: string | null;
  occurredOn: string;
  eventKind: PermitEventKind;
  quantity: number;
};

type LedgerRow = {
  id: string;
  category: LedgerCategory;
  quantity: number;
} & LedgerEntrySortKey;

type PermitLedgerStep =
  | { kind: "open"; event: PermitEventRow }
  | { kind: "entry"; entry: LedgerRow }
  | { kind: "expiry"; event: PermitEventRow };

// 同じ日は「付与・繰越 → 記録 → 失効」の順に適用する。許可は有効期限の当日まで使え、
// 帳簿の表も失効行を同日の記録の後に並べるため。
const stepOrderInDay: Record<PermitLedgerStep["kind"], number> = { open: 0, entry: 1, expiry: 2 };

function resolveStepDate({ step }: { step: PermitLedgerStep }): string {
  return step.kind === "entry" ? step.entry.occurredOn : step.event.occurredOn;
}

function compareSteps({ a, b }: { a: PermitLedgerStep; b: PermitLedgerStep }): number {
  const dateCompare = resolveStepDate({ step: a }).localeCompare(resolveStepDate({ step: b }));
  if (dateCompare !== 0) {
    return dateCompare;
  }
  const orderCompare = stepOrderInDay[a.kind] - stepOrderInDay[b.kind];
  if (orderCompare !== 0) {
    return orderCompare;
  }
  if (a.kind === "entry" && b.kind === "entry") {
    return compareLedgerEntries({ a: a.entry, b: b.entry });
  }
  if (a.kind !== "entry" && b.kind !== "entry") {
    // DBは同日のイベントの順序を保証しない。帳簿の表も同日の失効行をイベントID順に並べるため、
    // 同じ順で適用して行ごとの残数を表示順とそろえる。
    return a.event.id.localeCompare(b.event.id);
  }
  return 0;
}

function sumRemaining({
  remainingByPermitId,
}: {
  remainingByPermitId: Map<string | null, number>;
}) {
  let total = 0;
  for (const remaining of remainingByPermitId.values()) {
    total += remaining;
  }
  return total;
}

/**
 * 用途の許可残数を許可ごとに追う。失効はその許可の残りだけを消し、ほかの許可の残りは残す。
 * 譲受記録は許可IDを持たないため、その時点で有効な許可のうち有効期限の早いものから順に差し引く。
 * 許可IDのない旧形式のイベントは1つの許可として扱い、旧形式の失効はその残りだけを消す。
 */
function runPermitLedger({
  permitEvents,
  ledgerEntries,
  isEventApplied,
}: {
  permitEvents: PermitEventRow[];
  ledgerEntries: LedgerRow[];
  isEventApplied: (event: PermitEventRow) => boolean;
}): {
  balanceById: Map<string, number>;
  remainingByPermitId: Map<string | null, number>;
} {
  // 差し引く順は、まだ適用しない未来の失効も含めた有効期限で決める。
  const expiresOnByPermitId = new Map<string, string>();
  for (const event of permitEvents) {
    if (event.eventKind !== "expiry" || !event.permitId) {
      continue;
    }
    const current = expiresOnByPermitId.get(event.permitId);
    if (!current || event.occurredOn < current) {
      expiresOnByPermitId.set(event.permitId, event.occurredOn);
    }
  }

  // 有効期限のない許可（旧形式など）は最後に差し引く。
  const resolveExpiresOn = ({ permitId }: { permitId: string | null }): string =>
    (permitId && expiresOnByPermitId.get(permitId)) || "9999-12-31";

  const steps: PermitLedgerStep[] = [
    ...permitEvents
      .filter(isEventApplied)
      .map((event) =>
        event.eventKind === "expiry"
          ? { kind: "expiry" as const, event }
          : { kind: "open" as const, event },
      ),
    ...ledgerEntries.map((entry) => ({ kind: "entry" as const, entry })),
  ].sort((a, b) => compareSteps({ a, b }));

  // Map の挿入順は許可を開いた順になり、有効期限が同じ許可は先に開いた方から差し引く。
  const remainingByPermitId = new Map<string | null, number>();
  const balanceById = new Map<string, number>();

  for (const step of steps) {
    if (step.kind === "open") {
      const { permitId, quantity } = step.event;
      remainingByPermitId.set(permitId, (remainingByPermitId.get(permitId) ?? 0) + quantity);
      continue;
    }

    if (step.kind === "expiry") {
      remainingByPermitId.delete(step.event.permitId);
      balanceById.set(step.event.id, sumRemaining({ remainingByPermitId }));
      continue;
    }

    if (step.entry.category === "acquire") {
      let unallocated = step.entry.quantity;
      const permitIdsByExpiry = [...remainingByPermitId.keys()].sort((a, b) =>
        resolveExpiresOn({ permitId: a }).localeCompare(resolveExpiresOn({ permitId: b })),
      );
      for (const permitId of permitIdsByExpiry) {
        const remaining = remainingByPermitId.get(permitId) ?? 0;
        const allocated = Math.min(remaining, unallocated);
        remainingByPermitId.set(permitId, remaining - allocated);
        unallocated -= allocated;
      }
    }
    balanceById.set(step.entry.id, sumRemaining({ remainingByPermitId }));
  }

  return { balanceById, remainingByPermitId };
}

/**
 * 帳簿の表の許可残数。譲受記録と許可失効イベントのIDごとに、適用した後の残数を返す。
 * 許可イベントは今日までのものだけを使う。
 */
export function computeRunningPermitBalance({
  permitEvents,
  ledgerEntries,
  today,
}: {
  permitEvents: PermitEventRow[];
  ledgerEntries: LedgerRow[];
  today: string;
}): Map<string, number> {
  return runPermitLedger({
    permitEvents,
    ledgerEntries,
    isEventApplied: (event) =>
      isPermitEventOnOrBeforeToday({ occurredOn: event.occurredOn, today }),
  }).balanceById;
}

/**
 * 今日時点で使える許可残数と、許可ごとの残り。有効期限の当日の失効はまだ適用せず、
 * 今日より後の日付の記録は差し引かない。
 */
export function computeCurrentPermitState({
  permitEvents,
  ledgerEntries,
  today,
}: {
  permitEvents: PermitEventRow[];
  ledgerEntries: LedgerRow[];
  today: string;
}): { balance: number; remainingByPermitId: ReadonlyMap<string | null, number> } {
  const { remainingByPermitId } = runPermitLedger({
    permitEvents,
    ledgerEntries: ledgerEntries.filter((entry) => entry.occurredOn <= today),
    isEventApplied: (event) =>
      event.eventKind === "expiry" ? event.occurredOn < today : event.occurredOn <= today,
  });

  return { balance: sumRemaining({ remainingByPermitId }), remainingByPermitId };
}

export function filterByPurpose<T extends { purpose: LedgerPurpose | string }>({
  rows,
  purpose,
}: {
  rows: T[];
  purpose: LedgerPurpose;
}): T[] {
  return rows.filter((row) => row.purpose === purpose);
}
