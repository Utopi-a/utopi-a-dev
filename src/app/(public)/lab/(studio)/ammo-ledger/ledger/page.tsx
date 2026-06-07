import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { LedgerTable } from "@/features/ammo-ledger/components/ledger-table/ledger-table";
import { PurposeFilter } from "@/features/ammo-ledger/components/purpose-filter/purpose-filter";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { computeCurrentPermitBalance } from "@/features/ammo-ledger/permit/compute-running-permit-balance/compute-running-permit-balance";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { cn } from "@/lib/cn";

type PageProps = {
  searchParams: Promise<{ purpose?: string }>;
};

export default async function LedgerPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { purpose: purposeParam } = await searchParams;
  const purpose = parseLedgerPurpose({ value: purposeParam }) ?? "shooting";

  const entries = await listLedgerEntries({ userId: user.id, purpose });
  const permitEvents = await listPermitEvents({ userId: user.id, purpose });

  const permitBalance = computeCurrentPermitBalance({
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

  const from = entries[0]?.occurredOn ?? new Date().toISOString().slice(0, 10);
  const to = entries[entries.length - 1]?.occurredOn ?? from;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            実包管理帳簿（{ledgerPurposeLabels[purpose]}）
          </h1>
          <p className="text-sm text-muted-foreground">
            法定区分のみ表示。許可残数: {permitBalance}発
          </p>
        </div>
        <Link
          href={`/lab/ammo-ledger/ledger/print?purpose=${purpose}&from=${from}&to=${to}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          帳簿印刷
        </Link>
      </div>
      <AmmoLedgerNav />
      <PurposeFilter current={purpose} basePath="/lab/ammo-ledger/ledger" />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">記録一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <LedgerTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
