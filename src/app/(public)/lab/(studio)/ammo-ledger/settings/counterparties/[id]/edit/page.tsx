import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { CounterpartyForm } from "@/features/ammo-ledger/components/counterparty-form/counterparty-form";
import { getCounterparty } from "@/features/ammo-ledger/master/get-counterparty/get-counterparty";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCounterpartyPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAmmoUser();
  const counterparty = await getCounterparty({ id, userId: user.id });
  if (!counterparty) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">購入先を編集</h1>
        <Link
          href="/lab/ammo-ledger/settings/counterparties"
          className="text-sm text-muted-foreground"
        >
          一覧へ戻る
        </Link>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{counterparty.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CounterpartyForm
            recordId={counterparty.id}
            initialValues={{
              name: counterparty.name,
              address: counterparty.address,
              memo: counterparty.memo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
