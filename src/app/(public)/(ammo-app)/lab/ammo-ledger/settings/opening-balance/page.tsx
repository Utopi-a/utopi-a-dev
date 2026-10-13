import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { OpeningBalanceForm } from "@/features/ammo-ledger/components/opening-balance-form/opening-balance-form";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { buildAvailableYears } from "@/features/ammo-ledger/opening-balance/build-available-years/build-available-years";
import { computePriorYearEndStock } from "@/features/ammo-ledger/opening-balance/compute-prior-year-end-stock/compute-prior-year-end-stock";
import { getOpeningBalance } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { type LedgerPurpose, ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type PageProps = {
  searchParams: Promise<{ year?: string; purpose?: string }>;
};

export default async function OpeningBalanceSettingsPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { year: yearParam, purpose: purposeParam } = await searchParams;
  const currentYear = Number(getTokyoIsoDate().slice(0, 4));
  const parsedYear = yearParam ? Number(yearParam) : currentYear;
  const selectedYear =
    Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : currentYear;
  const selectedPurpose = parseLedgerPurpose({ value: purposeParam }) ?? "shooting";

  const [entries, permitEvents, permits, ammoTypes] = await Promise.all([
    listLedgerEntries({ userId: user.id }),
    listPermitEvents({ userId: user.id }),
    listAcquisitionPermits({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
  ]);

  const years = buildAvailableYears({
    dates: [
      ...entries.map((entry) => entry.occurredOn),
      ...permitEvents.map((event) => event.occurredOn),
    ],
    currentYear,
  });

  const snapshotsByPurpose = Object.fromEntries(
    ledgerPurposes.map((purpose) => [
      purpose,
      getOpeningBalance({
        year: selectedYear,
        purpose: purpose as LedgerPurpose,
        entries,
        permitEvents,
        permits,
      }),
    ]),
  ) as Record<LedgerPurpose, ReturnType<typeof getOpeningBalance>>;
  const priorYearEndStockByPurpose = computePriorYearEndStock({
    entries: entries.map((entry) => ({ ...entry, category: entry.category as LedgerCategory })),
    year: selectedYear,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">年初繰越</h1>
        <p className="text-sm text-muted-foreground">
          各年の1月1日時点の残弾数と譲り受け許可残数（有効期限付き）を登録します。印刷する帳簿は、年ごとにこの繰越から数え始めます。
        </p>
      </div>

      <OpeningBalanceForm
        key={selectedYear}
        years={years}
        initialYear={selectedYear}
        initialPurpose={selectedPurpose}
        ammoTypes={ammoTypes.map((type) => ({
          id: type.id,
          name: type.name,
          gaugeNumber: type.gaugeNumber,
          roundsPerBox: type.roundsPerBox,
        }))}
        snapshotsByPurpose={snapshotsByPurpose}
        priorYearEndStockByPurpose={priorYearEndStockByPurpose}
      />
    </div>
  );
}
