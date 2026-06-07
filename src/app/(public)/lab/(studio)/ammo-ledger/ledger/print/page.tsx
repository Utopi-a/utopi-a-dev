import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { PrintButton } from "@/features/ammo-ledger/components/print-button/print-button";
import { LedgerPrintDocument } from "@/features/ammo-ledger/documents/ledger-print-document/ledger-print-document";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";
import { computeRunningPermitBalance } from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { type LedgerPurpose, ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import { cn } from "@/lib/cn";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function LedgerPrintPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { from: fromParam, to: toParam } = await searchParams;

  const year = new Date().getFullYear();
  const from = fromParam ?? `${year}-01-01`;
  const to = toParam ?? `${year}-12-31`;

  const [guns, ranges, counterparties, profile, ...purposeData] = await Promise.all([
    listGuns({ userId: user.id }),
    listRanges({ userId: user.id }),
    listCounterparties({ userId: user.id }),
    getLedgerProfile({ userId: user.id }),
    ...ledgerPurposes.map(async (purpose) => {
      const [entries, permitEvents] = await Promise.all([
        listLedgerEntries({ userId: user.id, purpose, from, to }),
        listPermitEvents({ userId: user.id, purpose }),
      ]);

      const permitBalances = computeRunningPermitBalance({
        permitEvents: permitEvents.map((event) => ({
          occurredOn: event.occurredOn,
          eventKind: event.eventKind as PermitEventKind,
          quantity: event.quantity,
        })),
        ledgerEntries: entries.map((entry) => ({
          id: entry.id,
          occurredOn: entry.occurredOn,
          category: entry.category as LedgerCategory,
          quantity: entry.quantity,
        })),
      });

      return {
        purpose: purpose as LedgerPurpose,
        entries,
        permitBalances,
      };
    }),
  ]);

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  return (
    <div className="space-y-4">
      <div className="no-print flex gap-2">
        <Link
          href="/lab/ammo-ledger/ledger"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 帳簿に戻る
        </Link>
        <PrintButton />
      </div>
      <LedgerPrintDocument
        ownerName={ownerName}
        ownerAddress={profile?.ownerAddress}
        from={from}
        to={to}
        guns={guns}
        ranges={ranges}
        counterparties={counterparties}
        purposeSections={purposeData}
      />
    </div>
  );
}
