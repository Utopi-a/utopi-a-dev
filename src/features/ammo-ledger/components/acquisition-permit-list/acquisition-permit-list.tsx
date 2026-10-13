import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { AcquisitionPermitRowActions } from "@/features/ammo-ledger/components/acquisition-permit-row-actions/acquisition-permit-row-actions";
import { MasterListItem } from "@/features/ammo-ledger/components/master-list-item/master-list-item";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { formatPermitExpiryLabel } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import {
  computeCurrentPermitState,
  filterByPurpose,
} from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import {
  type PermitStatus,
  resolvePermitStatus,
} from "@/features/ammo-ledger/permit/resolve-permit-status/resolve-permit-status";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type AcquisitionPermit = typeof ammoAcquisitionPermit.$inferSelect;

type AcquisitionPermitListProps = {
  permits: AcquisitionPermit[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  ledgerEntries: (typeof ammoLedgerEntry.$inferSelect)[];
  today: string;
};

type PermitListItem = {
  permit: AcquisitionPermit;
  remaining: number;
  status: PermitStatus;
  isCarryover: boolean;
};

// 譲受記録は用途の中の許可から差し引くため、残りは用途ごとに計算する。
function computeRemainingByPermitId({
  permitEvents,
  ledgerEntries,
  today,
}: Omit<AcquisitionPermitListProps, "permits">): Map<string | null, number> {
  const remainingByPermitId = new Map<string | null, number>();
  for (const purpose of ledgerPurposes) {
    const state = computeCurrentPermitState({
      permitEvents: filterByPurpose({ rows: permitEvents, purpose }).map((event) => ({
        ...event,
        eventKind: event.eventKind as PermitEventKind,
      })),
      ledgerEntries: filterByPurpose({ rows: ledgerEntries, purpose }).map((entry) => ({
        ...entry,
        category: entry.category as LedgerCategory,
      })),
      today,
    });
    for (const [permitId, remaining] of state.remainingByPermitId) {
      remainingByPermitId.set(permitId, remaining);
    }
  }
  return remainingByPermitId;
}

function formatStatusLabel({ item }: { item: PermitListItem }): string {
  switch (item.status) {
    case "active":
      return `残り ${formatStockQuantity({ quantity: item.remaining })}`;
    case "upcoming":
      return "開始前";
    case "used_up":
      return "使い切り";
    case "expired":
      return "期限切れ";
  }
}

function PermitRow({ item, today }: { item: PermitListItem; today: string }) {
  const { permit, status } = item;
  const isEnded = status === "used_up" || status === "expired";

  return (
    <MasterListItem className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">
            {permit.name} — {permit.permitPurpose}
          </span>
          {item.isCarryover ? (
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">
              年初繰越
            </span>
          ) : null}
        </span>
        <span
          className={
            status === "active"
              ? "mt-0.5 block font-medium tabular-nums"
              : "mt-0.5 block text-muted-foreground"
          }
        >
          {formatStatusLabel({ item })}
        </span>
        <span className="mt-0.5 block text-muted-foreground">
          {ledgerPurposeLabels[permit.ledgerPurpose as LedgerPurpose]} / 付与{" "}
          {formatIsoDateForDisplay({ value: permit.grantedOn })} / 許可{" "}
          {formatStockQuantity({ quantity: permit.quantity })} /{" "}
          {isEnded
            ? `${formatIsoDateForDisplay({ value: permit.expiresOn })}まで`
            : formatPermitExpiryLabel({ expiresOn: permit.expiresOn, today })}
        </span>
      </span>
      <AcquisitionPermitRowActions permitId={permit.id} />
    </MasterListItem>
  );
}

export function AcquisitionPermitList({
  permits,
  permitEvents,
  ledgerEntries,
  today,
}: AcquisitionPermitListProps) {
  if (permits.length === 0) {
    return <p className="text-sm text-muted-foreground">まだ登録がありません。</p>;
  }

  const remainingByPermitId = computeRemainingByPermitId({ permitEvents, ledgerEntries, today });
  const carryoverPermitIds = new Set(
    permitEvents.flatMap((event) =>
      event.eventKind === "carryover" && event.permitId ? [event.permitId] : [],
    ),
  );
  const items = permits.map((permit): PermitListItem => {
    const remaining = remainingByPermitId.get(permit.id) ?? 0;
    return {
      permit,
      remaining,
      status: resolvePermitStatus({
        grantedOn: permit.grantedOn,
        expiresOn: permit.expiresOn,
        remaining,
        today,
      }),
      isCarryover: carryoverPermitIds.has(permit.id),
    };
  });
  const currentItems = [
    ...items.filter((item) => item.status === "active"),
    ...items.filter((item) => item.status === "upcoming"),
  ];
  const endedItems = items.filter((item) => item.status === "used_up" || item.status === "expired");

  return (
    <div className="space-y-4">
      {currentItems.length > 0 ? (
        <ul className="divide-y divide-border/50 text-sm">
          {currentItems.map((item) => (
            <PermitRow key={item.permit.id} item={item} today={today} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">有効な許可・開始前の許可はありません。</p>
      )}
      {endedItems.length > 0 ? (
        <details className="rounded-lg border border-border/60 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            終了した許可（期限切れ・使い切り {endedItems.length}件）
          </summary>
          <ul className="mt-3 divide-y divide-border/50 text-sm">
            {endedItems.map((item) => (
              <PermitRow key={item.permit.id} item={item} today={today} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
