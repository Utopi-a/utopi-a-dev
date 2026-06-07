import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { PrintButton } from "@/features/ammo-ledger/components/print-button/print-button";
import { LedgerPrintView } from "@/features/ammo-ledger/documents/ledger-print-view/ledger-print-view";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { computeRunningPermitBalance } from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { cn } from "@/lib/cn";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string; purpose?: string }>;
};

export default async function LedgerPrintPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { from: fromParam, to: toParam, purpose: purposeParam } = await searchParams;
  const purpose = parseLedgerPurpose({ value: purposeParam }) ?? "shooting";

  const year = new Date().getFullYear();
  const from = fromParam ?? `${year}-01-01`;
  const to = toParam ?? `${year}-12-31`;

  const entries = await listLedgerEntries({ userId: user.id, purpose, from, to });
  const permitEvents = await listPermitEvents({ userId: user.id, purpose });

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

  return (
    <div className="space-y-4">
      <div className="no-print flex gap-2">
        <Link
          href={`/lab/ammo-ledger/ledger?purpose=${purpose}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 帳簿に戻る
        </Link>
        <PrintButton />
      </div>
      <LedgerPrintView
        entries={entries}
        from={from}
        to={to}
        purpose={purpose}
        permitBalances={permitBalances}
      />
    </div>
  );
}
