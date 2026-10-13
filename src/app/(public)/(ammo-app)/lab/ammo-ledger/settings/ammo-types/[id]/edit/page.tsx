import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoTypeForm } from "@/features/ammo-ledger/components/ammo-type-form/ammo-type-form";
import { getAmmoType } from "@/features/ammo-ledger/master/get-ammo-type/get-ammo-type";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import { extractCustomAmmoTypeName } from "@/features/ammo-ledger/schema/extract-custom-ammo-type-name";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "弾種の編集" };

export default async function EditAmmoTypePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAmmoUser();
  const ammoType = await getAmmoType({ id, userId: user.id });
  if (!ammoType) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">弾種を編集</h1>
        <Link href="/lab/ammo-ledger/settings/ammo-types" className="text-sm text-muted-foreground">
          一覧へ戻る
        </Link>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{ammoType.name}</CardTitle>
          <CardDescription>
            ここで変更しても、記録済みの帳簿の弾種名は変わりません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AmmoTypeForm
            recordId={ammoType.id}
            initialValues={{
              name: extractCustomAmmoTypeName({
                name: ammoType.name,
                caliber: ammoType.caliber,
                cartridgeType: ammoType.cartridgeType as CartridgeType,
                gaugeNumber: ammoType.gaugeNumber,
              }),
              caliber: ammoType.caliber,
              cartridgeType: ammoType.cartridgeType,
              gaugeNumber: ammoType.gaugeNumber,
              roundsPerBox: ammoType.roundsPerBox,
              defaultPurpose: ammoType.defaultPurpose,
              memo: ammoType.memo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
