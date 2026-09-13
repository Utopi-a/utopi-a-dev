import { notFound } from "next/navigation";
import { GunPermitFieldCalibrationViewLazy } from "@/features/ammo-ledger/gun-possession-permit-application/field-calibration/gun-permit-field-calibration-view.lazy";
import { isDevelopmentEnvironment } from "@/lib/is-development-environment";

export default function GunPossessionPermitFieldCalibrationPage() {
  if (!isDevelopmentEnvironment()) {
    notFound();
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h1 className="text-base font-semibold">銃所持許可申請 フィールド座標調整</h1>
        <p className="text-xs text-muted-foreground">開発用 · フル幅編集モード</p>
      </div>
      <GunPermitFieldCalibrationViewLazy />
    </div>
  );
}
