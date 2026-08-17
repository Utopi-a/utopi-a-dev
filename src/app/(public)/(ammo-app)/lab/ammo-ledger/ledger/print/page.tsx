import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { LedgerPrintControls } from "@/features/ammo-ledger/components/ledger-print-controls/ledger-print-controls";
import { LedgerPrintDocumentLazy } from "@/features/ammo-ledger/documents/ledger-print-document/ledger-print-document.lazy";
import { validateLedgerForLock } from "@/features/ammo-ledger/documents/validate-ledger-for-lock/validate-ledger-for-lock";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";
import {
  buildAvailableYears,
  buildYearDateRange,
} from "@/features/ammo-ledger/opening-balance/build-available-years/build-available-years";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type PageProps = {
  searchParams: Promise<{
    year?: string;
    from?: string;
    to?: string;
    preview?: string;
    print?: string;
  }>;
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

function resolveTargetDate({ year, today }: { year: number; today: string }): string {
  const todayYear = Number(today.slice(0, 4));
  if (year < todayYear) {
    return `${year}-12-31`;
  }
  return today;
}

export default async function LedgerPrintPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { year: yearParam, from: fromParam, preview: previewParam } = await searchParams;
  const today = getTokyoIsoDate();
  const currentYear = Number(today.slice(0, 4));
  const selectedYear = resolvePrintYear({ yearParam, fromParam, currentYear });
  const { from, to } = buildYearDateRange({ year: selectedYear });

  const targetDate = resolveTargetDate({ year: selectedYear, today });

  const [allEntries, guns, ranges, profile, lockState] = await Promise.all([
    listLedgerEntries({ userId: user.id }),
    listGuns({ userId: user.id }),
    listRanges({ userId: user.id }),
    getLedgerProfile({ userId: user.id }),
    getLatestLockState({ userId: user.id }),
  ]);

  const availableYears = buildAvailableYears({
    dates: allEntries.map((entry) => entry.occurredOn),
    currentYear,
  });

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  const isTargetLocked =
    lockState.isLocked && lockState.lockedThrough !== null && lockState.lockedThrough >= targetDate;

  const lockedThrough = lockState.lockedThrough ?? "";
  const officialTo = isTargetLocked ? (lockedThrough < to ? lockedThrough : to) : to;

  const yearEntries = await listLedgerEntries({ userId: user.id, from, to: targetDate });
  const lockIssues = validateLedgerForLock({
    entries: yearEntries,
    from,
    to: targetDate,
  });
  const canPrintOfficially = isTargetLocked && lockIssues.length === 0;
  const isPreview = previewParam === "1" && !canPrintOfficially;
  const printTo = isTargetLocked ? officialTo : to;

  const entries =
    canPrintOfficially || isPreview
      ? await listLedgerEntries({ userId: user.id, from, to: printTo })
      : [];

  return (
    <div className="space-y-4">
      <LedgerPrintControls
        years={availableYears}
        selectedYear={selectedYear}
        lockedThrough={lockState.lockedThrough}
        isTargetLocked={isTargetLocked}
        canPrintOfficially={canPrintOfficially}
        isPreview={isPreview}
        targetDate={targetDate}
        entryCount={yearEntries.filter((e) => e.voidedAt === null).length}
        lockIssues={lockIssues}
      />
      {canPrintOfficially || isPreview ? (
        <LedgerPrintDocumentLazy
          ownerName={ownerName}
          ownerAddress={profile?.ownerAddress}
          from={from}
          to={printTo}
          year={selectedYear}
          guns={guns}
          ranges={ranges}
          entries={entries}
          isPreview={isPreview}
        />
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-6 text-center">
          <p className="text-sm font-medium">
            {isTargetLocked
              ? "帳簿の問題を修正すると正式な帳票を印刷できます"
              : "帳簿を確定すると正式な帳票を印刷できます"}
          </p>
          {!isTargetLocked ? (
            <p className="mt-2 text-xs text-muted-foreground">
              上の「{formatIsoDateForDisplay({ value: targetDate })}
              まで確定して印刷」を押すか、未確定プレビューを確認してください。
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
