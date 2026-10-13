import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AcquisitionPermitForm } from "@/features/ammo-ledger/components/acquisition-permit-form/acquisition-permit-form";
import { AcquisitionPermitList } from "@/features/ammo-ledger/components/acquisition-permit-list/acquisition-permit-list";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import { cn } from "@/lib/cn";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

export default async function AcquisitionPermitsSettingsPage() {
  const user = await requireAmmoUser();
  const [permits, permitEvents, ledgerEntries] = await Promise.all([
    listAcquisitionPermits({ userId: user.id }),
    listPermitEvents({ userId: user.id }),
    listLedgerEntries({ userId: user.id }),
  ]);
  const today = getTokyoIsoDate();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">譲受許可</h1>
        <p className="text-sm text-muted-foreground">
          警察から交付された譲受許可を登録します。帳簿の許可残数計算に使われます。
        </p>
      </div>

      <div className="no-print">
        <Link
          href="/lab/ammo-ledger/applications/acquisition-permit/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          譲受許可申請書を作る
        </Link>
      </div>

      <AmmoLedgerPanel title="登録済み">
        <AcquisitionPermitList
          permits={permits}
          permitEvents={permitEvents}
          ledgerEntries={ledgerEntries}
          today={today}
        />
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="許可を追加">
        <AcquisitionPermitForm />
      </AmmoLedgerPanel>
    </div>
  );
}
