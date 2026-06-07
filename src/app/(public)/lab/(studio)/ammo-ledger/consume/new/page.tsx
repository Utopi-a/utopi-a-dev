import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { ConsumeForm } from "@/features/ammo-ledger/components/consume-form/consume-form";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

type PageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function ConsumeNewPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { draft: draftId } = await searchParams;

  const [guns, ammoTypes, ranges, draft] = await Promise.all([
    listGuns({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
    listRanges({ userId: user.id }),
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
        <h1 className="text-2xl font-semibold tracking-tight">今日撃った</h1>
        <p className="text-sm text-muted-foreground">
          箱数・バラで入力。帳簿には消費発数のみ出ます。
        </p>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">消費記録</CardTitle>
        </CardHeader>
        <CardContent>
          {guns.length === 0 || ammoTypes.length === 0 || ranges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              銃・弾種・射撃場のマスタを
              <a href="/lab/ammo-ledger/settings" className="underline">
                設定
              </a>
              から登録してください。
            </p>
          ) : (
            <ConsumeForm
              guns={guns}
              ammoTypes={ammoTypes}
              ranges={ranges}
              initialValues={initialValues}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
