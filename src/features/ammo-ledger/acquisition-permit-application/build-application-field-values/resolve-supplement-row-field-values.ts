import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";

const CHECK_MARK = "✓";

export function resolveSupplementRowMemoFields({
  purpose,
  isAcquisition,
}: {
  purpose: AcquisitionPermitPurpose;
  isAcquisition: boolean;
}): {
  memoTargetShooting: string;
  memoHunting: string;
  memoOther: string;
  memoOtherText: string;
} {
  if (isAcquisition) {
    return {
      memoTargetShooting: "",
      memoHunting: "",
      memoOther: "",
      memoOtherText: "",
    };
  }

  if (purpose === "標的射撃" || purpose === "射撃競技") {
    return {
      memoTargetShooting: CHECK_MARK,
      memoHunting: "",
      memoOther: "",
      memoOtherText: "",
    };
  }

  if (purpose === "狩猟（鳥獣の捕獲）" || purpose === "有害鳥獣の駆除") {
    return {
      memoTargetShooting: "",
      memoHunting: CHECK_MARK,
      memoOther: "",
      memoOtherText: "",
    };
  }

  return {
    memoTargetShooting: "",
    memoHunting: "",
    memoOther: CHECK_MARK,
    memoOtherText: purpose === "その他" ? "" : purpose,
  };
}

export function resolveSupplementRowLocationFields({
  isAcquisition,
  locationName,
  locationAddress,
}: {
  isAcquisition: boolean;
  locationName: string;
  locationAddress: string;
}): {
  locationCounterparty: string;
  locationRangeName: string;
  locationRangeAddress: string;
} {
  if (isAcquisition) {
    return {
      locationCounterparty: locationName,
      locationRangeName: "",
      locationRangeAddress: "",
    };
  }

  return {
    locationCounterparty: "",
    locationRangeName: locationName,
    locationRangeAddress: locationAddress,
  };
}
