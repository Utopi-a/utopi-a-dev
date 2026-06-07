import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export function mapLedgerPurposeToPermitPurpose({
  purpose,
}: {
  purpose: LedgerPurpose;
}): AcquisitionPermitPurpose {
  switch (purpose) {
    case "shooting":
      return "標的射撃";
    case "hunting":
      return "狩猟（鳥獣の捕獲）";
    case "pest_control":
      return "有害鳥獣の駆除";
  }
}
