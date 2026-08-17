import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";
import { LedgerLockForm } from "@/features/ammo-ledger/ledger/lock/ledger-lock-form/ledger-lock-form";
import { listLockEvents } from "@/features/ammo-ledger/ledger/lock/list-lock-events/list-lock-events";

export default async function LedgerLockSettingsPage() {
  const user = await requireAmmoUser();
  const [lockState, events] = await Promise.all([
    getLatestLockState({ userId: user.id }),
    listLockEvents({ userId: user.id }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">帳簿の確定・ロック</h1>
        <p className="text-sm text-muted-foreground">
          帳簿の特定期間を確定し、変更不可にします。ロック期間の帳簿は編集・取消・並び替えができなくなります。
        </p>
      </div>
      <AmmoLedgerPanel>
        <LedgerLockForm lockState={lockState} events={events} />
      </AmmoLedgerPanel>
    </div>
  );
}
