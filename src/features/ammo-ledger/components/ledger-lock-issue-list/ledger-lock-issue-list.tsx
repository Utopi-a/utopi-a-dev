import Link from "next/link";
import type { LedgerLockIssue } from "@/features/ammo-ledger/documents/validate-ledger-for-lock/validate-ledger-for-lock";
import { ledgerPurposeLabels, ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

export function LedgerLockIssueList({ issues }: { issues: LedgerLockIssue[] }) {
  const groups = [null, ...ledgerPurposes]
    .map((purpose) => ({
      purpose,
      label: purpose ? ledgerPurposeLabels[purpose] : "用途共通",
      issues: issues.filter((issue) => issue.purpose === purpose),
    }))
    .filter((group) => group.issues.length > 0);

  return (
    <div className="mt-2 space-y-3">
      {groups.map((group) => (
        <section key={group.label} aria-label={`${group.label}の問題`}>
          <h3 className="text-xs font-semibold text-destructive">
            {group.label}（{group.issues.length}件）
          </h3>
          <ul className="mt-1 space-y-1 text-xs text-destructive/90">
            {group.issues.map((issue) => (
              <li key={`${issue.kind}-${issue.entryId}-${issue.message}`} className="break-words">
                <Link
                  href={issue.href}
                  className="underline underline-offset-2 hover:text-destructive"
                >
                  {issue.entryId
                    ? `${formatIsoDateForDisplay({ value: issue.occurredOn })}: ${issue.message}`
                    : issue.message}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
