import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { PermitEventForm } from "@/features/ammo-ledger/components/permit-event-form/permit-event-form";
import { deletePermitEventAction } from "@/features/ammo-ledger/permit/delete-permit-event/delete-permit-event-action";
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
      <h1 className="text-2xl font-semibold tracking-tight">許可残数イベント</h1>
      <p className="text-sm text-muted-foreground">
        許可取得・失効・繰越を手入力します。帳簿の許可残数列に反映されます。
      </p>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">登録済み</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {events.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-4">
                  <span>
                    {event.occurredOn} — {ledgerPurposeLabels[event.purpose as LedgerPurpose]}{" "}
                    {permitEventKindLabels[event.eventKind as PermitEventKind]} {event.quantity}発
                    {event.memo ? `（${event.memo}）` : ""}
                  </span>
                  <MasterRowActions onDelete={() => deletePermitEventAction({ id: event.id })} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">追加</CardTitle>
        </CardHeader>
        <CardContent>
          <PermitEventForm />
        </CardContent>
      </Card>
    </div>
  );
}
