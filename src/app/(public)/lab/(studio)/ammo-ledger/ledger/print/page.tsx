import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { PrintButton } from "@/features/ammo-ledger/components/print-button/print-button";
import { LedgerPrintView } from "@/features/ammo-ledger/documents/ledger-print-view/ledger-print-view";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
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

  const entries = await listLedgerEntries({ userId: user.id, from, to });

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
      <LedgerPrintView entries={entries} from={from} to={to} />
    </div>
  );
}
