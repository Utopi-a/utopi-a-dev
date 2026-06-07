import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AcquireForm } from "@/features/ammo-ledger/components/acquire-form/acquire-form";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

type PageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function AcquireNewPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { draft: draftId } = await searchParams;

  const [ammoTypes, counterparties, draft] = await Promise.all([
    listAmmoTypes({ userId: user.id }),
    listCounterparties({ userId: user.id }),
    draftId ? getDraftTransaction({ userId: user.id, draftId }) : Promise.resolve(null),
  ]);

  const initialValues = draft
    ? {
        occurredOn: draft.occurredOn,
        ammoTypeId: draft.ammoTypeId ?? undefined,
        boxCount: draft.boxCount,
        looseRounds: draft.looseRounds,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">弾を買った</h1>
        <p className="text-sm text-muted-foreground">譲受記録を入力します。</p>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">譲受記録</CardTitle>
        </CardHeader>
        <CardContent>
          {ammoTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              弾種マスタを
              <a href="/lab/ammo-ledger/settings/ammo-types" className="underline">
                登録
              </a>
              してください。
            </p>
          ) : (
            <AcquireForm
              ammoTypes={ammoTypes}
              counterparties={counterparties}
              initialValues={initialValues}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
