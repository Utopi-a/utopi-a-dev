import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
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
        <h1 className="text-2xl font-semibold tracking-tight">消費した</h1>
        <p className="text-sm text-muted-foreground">
          箱数・バラで入力できます。帳簿には消費の発数のみ記録されます。
        </p>
      </div>
      <AmmoLedgerNav />
      <AmmoLedgerPanel>
        {guns.length === 0 || ammoTypes.length === 0 || ranges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            銃・弾種・射撃場のマスタを
            <Link href="/lab/ammo-ledger/settings" className="underline">
              設定
            </Link>
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
      </AmmoLedgerPanel>
    </div>
  );
}
