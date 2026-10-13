import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { GunForm } from "@/features/ammo-ledger/components/gun-form/gun-form";
import { getGun } from "@/features/ammo-ledger/master/get-gun/get-gun";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "銃の編集" };

export default async function EditGunPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAmmoUser();
  const gun = await getGun({ id, userId: user.id });
  if (!gun) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">銃を編集</h1>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{gun.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <GunForm
            recordId={gun.id}
            initialValues={{
              name: gun.name,
              gunNumber: gun.gunNumber,
              permitNumber: gun.permitNumber,
              gunType: gun.gunType,
              caliber: gun.caliber,
              purpose: gun.purpose,
              memo: gun.memo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
