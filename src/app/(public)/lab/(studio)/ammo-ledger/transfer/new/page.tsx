import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

type PageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function TransferNewPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { draft: draftId } = await searchParams;

  const [ammoTypes, draft] = await Promise.all([
    listAmmoTypes({ userId: user.id }),
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
        <h1 className="text-2xl font-semibold tracking-tight">弾を譲渡した</h1>
        <p className="text-sm text-muted-foreground">譲渡記録を入力します。</p>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">譲渡記録</CardTitle>
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
            <TransferForm ammoTypes={ammoTypes} initialValues={initialValues} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
