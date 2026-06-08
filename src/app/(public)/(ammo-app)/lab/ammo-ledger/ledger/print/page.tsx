import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { LedgerPrintControls } from "@/features/ammo-ledger/components/ledger-print-controls/ledger-print-controls";
import { LedgerPrintDocument } from "@/features/ammo-ledger/documents/ledger-print-document/ledger-print-document";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";
import {
  buildAvailableYears,
  buildYearDateRange,
} from "@/features/ammo-ledger/opening-balance/build-available-years/build-available-years";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";

type PageProps = {
  searchParams: Promise<{ year?: string; from?: string; to?: string }>;
};

function resolvePrintYear({
  yearParam,
  fromParam,
  currentYear,
}: {
  yearParam?: string;
  fromParam?: string;
  currentYear: number;
}): number {
  if (yearParam) {
    const parsed = Number(yearParam);
    if (Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100) {
      return parsed;
    }
  }

  if (fromParam) {
    const parsed = Number(fromParam.slice(0, 4));
    if (Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100) {
      return parsed;
    }
  }

  return currentYear;
}

export default async function LedgerPrintPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { year: yearParam, from: fromParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = resolvePrintYear({ yearParam, fromParam, currentYear });
  const { from, to } = buildYearDateRange({ year: selectedYear });

  const [
    allEntries,
    allPermitEvents,
    guns,
    ranges,
    counterparties,
    profile,
    entries,
    permitEvents,
    permits,
    ammoTypes,
  ] = await Promise.all([
    listLedgerEntries({ userId: user.id }),
    listPermitEvents({ userId: user.id }),
    listGuns({ userId: user.id }),
    listRanges({ userId: user.id }),
    listCounterparties({ userId: user.id }),
    getLedgerProfile({ userId: user.id }),
    listLedgerEntries({ userId: user.id, from, to }),
    listPermitEvents({ userId: user.id }),
    listAcquisitionPermits({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
  ]);

  const availableYears = buildAvailableYears({
    dates: [
      ...allEntries.map((entry) => entry.occurredOn),
      ...allPermitEvents.map((event) => event.occurredOn),
    ],
    currentYear,
  });

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  return (
    <div className="space-y-4">
      <LedgerPrintControls years={availableYears} selectedYear={selectedYear} />
      <LedgerPrintDocument
        ownerName={ownerName}
        ownerAddress={profile?.ownerAddress}
        from={from}
        to={to}
        year={selectedYear}
        guns={guns}
        ranges={ranges}
        counterparties={counterparties}
        entries={entries}
        permitEvents={permitEvents}
        permits={permits}
        ammoTypes={ammoTypes}
      />
    </div>
  );
}
