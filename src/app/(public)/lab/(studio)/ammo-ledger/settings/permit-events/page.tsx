import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { PermitEventForm } from "@/features/ammo-ledger/components/permit-event-form/permit-event-form";
import { PermitEventRowActions } from "@/features/ammo-ledger/components/permit-event-row-actions/permit-event-row-actions";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  type PermitEventKind,
  permitEventKindLabels,
} from "@/features/ammo-ledger/schema/permit-event-kind";

export default async function PermitEventsSettingsPage() {
  const user = await requireAmmoUser();
  const events = await listPermitEvents({ userId: user.id });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">許可残数イベント</h1>
        <p className="text-sm text-muted-foreground">
          許可取得・失効・繰越を手入力します。帳簿の許可残数に反映されます。
        </p>
      </div>
      <AmmoLedgerNav />
      <AmmoLedgerPanel title="登録済み">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  {event.occurredOn} — {ledgerPurposeLabels[event.purpose as LedgerPurpose]}{" "}
                  {permitEventKindLabels[event.eventKind as PermitEventKind]} {event.quantity}発
                  {event.memo ? `（${event.memo}）` : ""}
                </span>
                <PermitEventRowActions eventId={event.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="追加">
        <PermitEventForm />
      </AmmoLedgerPanel>
    </div>
  );
}
