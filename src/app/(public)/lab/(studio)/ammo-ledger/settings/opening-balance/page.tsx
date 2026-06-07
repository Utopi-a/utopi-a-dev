import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { OpeningBalanceForm } from "@/features/ammo-ledger/components/opening-balance-form/opening-balance-form";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { buildAvailableYears } from "@/features/ammo-ledger/opening-balance/build-available-years/build-available-years";
import { getOpeningBalance } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import { type LedgerPurpose, ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";

type PageProps = {
  searchParams: Promise<{ year?: string }>;
};

export default async function OpeningBalanceSettingsPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsedYear = yearParam ? Number(yearParam) : currentYear;
  const selectedYear =
    Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : currentYear;

  const [entries, permitEvents, ammoTypes] = await Promise.all([
    listLedgerEntries({ userId: user.id }),
    listPermitEvents({ userId: user.id }),
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
      }),
    ]),
  ) as Record<LedgerPurpose, ReturnType<typeof getOpeningBalance>>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">年初繰越</h1>
        <p className="text-sm text-muted-foreground">
          紙の帳簿から移行するとき、各年の1月1日時点の残弾数と譲り受け許可残数を登録できます。
        </p>
      </div>
      <AmmoLedgerNav />

      <OpeningBalanceForm
        years={years}
        initialYear={selectedYear}
        ammoTypes={ammoTypes.map((type) => ({
          id: type.id,
          name: type.name,
          gaugeNumber: type.gaugeNumber,
          roundsPerBox: type.roundsPerBox,
        }))}
        snapshotsByPurpose={snapshotsByPurpose}
      />
    </div>
  );
}
