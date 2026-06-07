import { notFound } from "next/navigation";
import { FieldCalibrationView } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/field-calibration-view";
import { isFieldCalibrationEnabled } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/is-field-calibration-enabled";

export default function AcquisitionPermitFieldCalibrationPage() {
  if (!isFieldCalibrationEnabled()) {
    notFound();
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h1 className="text-base font-semibold">申請書フィールド座標調整</h1>
        <p className="text-xs text-muted-foreground">開発用 · フル幅編集モード</p>
      </div>
      <FieldCalibrationView />
    </div>
  );
}
