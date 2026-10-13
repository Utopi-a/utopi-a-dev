import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { RangeForm } from "@/features/ammo-ledger/components/range-form/range-form";
import { getRange } from "@/features/ammo-ledger/master/get-range/get-range";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "射撃場の編集" };

export default async function EditRangePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAmmoUser();
  const range = await getRange({ id, userId: user.id });
  if (!range) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">射撃場を編集</h1>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{range.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <RangeForm
            recordId={range.id}
            initialValues={{
              name: range.name,
              address: range.address,
              memo: range.memo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
