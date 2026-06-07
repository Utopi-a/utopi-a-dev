import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ActivePermitStatus } from "@/features/ammo-ledger/components/active-permit-status/active-permit-status";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { HomeStorageWarning } from "@/features/ammo-ledger/components/home-storage-warning/home-storage-warning";
import { LedgerTableShell } from "@/features/ammo-ledger/components/ledger-table/ledger-table-shell";
import { PurposeFilter } from "@/features/ammo-ledger/components/purpose-filter/purpose-filter";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import {
  computeCurrentPermitBalance,
  computeRunningPermitBalance,
} from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";

type PageProps = {
  searchParams: Promise<{ purpose?: string }>;
};

export default async function LedgerPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { purpose: purposeParam } = await searchParams;
  const purpose = parseLedgerPurpose({ value: purposeParam }) ?? "shooting";
  const today = new Date().toISOString().slice(0, 10);

  const [entries, allEntries, permitEvents, permits, profile] = await Promise.all([
    listLedgerEntries({ userId: user.id, purpose }),
    listLedgerEntries({ userId: user.id }),
    listPermitEvents({ userId: user.id, purpose }),
    listAcquisitionPermits({ userId: user.id }),
    getLedgerProfile({ userId: user.id }),
  ]);

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  const permitEventRows = permitEvents.map((event) => ({
    occurredOn: event.occurredOn,
    eventKind: event.eventKind as PermitEventKind,
    quantity: event.quantity,
  }));

  const ledgerEntryRows = entries.map((entry) => ({
    id: entry.id,
    occurredOn: entry.occurredOn,
    category: entry.category as LedgerCategory,
    quantity: entry.quantity,
  }));

  const permitBalance = computeCurrentPermitBalance({
    permitEvents: permitEventRows,
    ledgerEntries: ledgerEntryRows,
  });

  const permitBalances = computeRunningPermitBalance({
    permitEvents: permitEventRows,
    ledgerEntries: ledgerEntryRows,
  });

  const homeStorage = evaluateHomeStorageLimit({
    entries: allEntries.map((entry) => ({
      id: entry.id,
      occurredOn: entry.occurredOn,
      category: entry.category as LedgerCategory,
      quantity: entry.quantity,
    })),
  });

  const from = entries[0]?.occurredOn ?? today;
  const to = entries[entries.length - 1]?.occurredOn ?? from;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">帳簿</h1>
        <p className="text-sm text-muted-foreground">{ledgerPurposeLabels[purpose]}の法定記録</p>
      </div>

      <AmmoLedgerNav />
      <PurposeFilter current={purpose} basePath="/lab/ammo-ledger/ledger" />

      <ActivePermitStatus
        permits={permits}
        ledgerPurpose={purpose}
        permitBalance={permitBalance}
        today={today}
      />

      <HomeStorageWarning
        currentStock={homeStorage.currentStock}
        peakStock={homeStorage.peakStock}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4 text-sm">
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          <div>
            <dt className="inline text-muted-foreground">氏名 </dt>
            <dd className="inline font-medium">{ownerName}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">件数 </dt>
            <dd className="inline font-medium tabular-nums">{entries.length}件</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">帳簿残数（全用途） </dt>
            <dd className="inline font-medium tabular-nums">
              {homeStorage.currentStock.toLocaleString("ja-JP")}発
            </dd>
          </div>
        </dl>
        <Link
          href={`/lab/ammo-ledger/ledger/print?purpose=${purpose}&from=${from}&to=${to}`}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          印刷する →
        </Link>
      </div>

      <LedgerTableShell
        entries={entries}
        permitBalances={permitBalances}
        homeStorageExceededEntryIds={homeStorage.exceededEntryIds}
      />
    </div>
  );
}
