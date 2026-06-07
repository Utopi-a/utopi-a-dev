import type { AcquisitionPermitApplicationInput } from "../acquisition-permit-application-types";
import { formatJapaneseDate } from "../acquisition-permit-application-types";
import type { ConsumptionPlanRow } from "../consumption-plan/consumption-plan-types";
import type {
  ApplicationFieldValues,
  SupplementRowFieldValues,
} from "../form-template/form-template-types";

export type BuiltApplicationFieldValues = {
  mainFields: ApplicationFieldValues;
  supplementRows: SupplementRowFieldValues[];
  supplementPageCount: number;
};

export function buildApplicationFieldValues({
  input,
}: {
  input: AcquisitionPermitApplicationInput;
}): BuiltApplicationFieldValues {
  const mainFields: ApplicationFieldValues = {
    applicationDate: formatJapaneseDate({ value: input.applicationDate }),
    ownerAddress: input.ownerAddress,
    ownerFurigana: input.ownerFurigana ?? "",
    ownerName: input.ownerName,
    ownerBirthDate: input.ownerBirthDate ? formatJapaneseDate({ value: input.ownerBirthDate }) : "",
    ownerPhone: input.ownerPhone ?? "",
    ammoName: input.ammoName,
    requestedQuantity: `${input.requestedQuantity}`,
    currentHomeStock:
      input.currentHomeStockDetail ??
      `${input.ammoName} ${input.currentHomeStock.toLocaleString("ja-JP")}個`,
    gunTypeAndCaliber: input.gunTypeAndCaliber ?? "",
    permitCertificateNumber: input.permitCertificateNumber ?? "",
    permitPurpose: input.permitPurpose,
    validFrom: formatJapaneseDate({ value: input.validFrom }),
    validTo: formatJapaneseDate({ value: input.validTo }),
    storageLocation: input.storageLocation,
    consumptionPlanNote: "別紙参照",
  };

  const supplementRows = input.consumptionPlan.rows.map((row: ConsumptionPlanRow) => {
    const purposeLabel = row.isAcquisition ? "購入" : row.purpose;

    return {
      rowIndex: row.rowIndex,
      values: {
        year: String(row.scheduledPeriod.year),
        month: String(row.scheduledPeriod.month),
        period: row.scheduledPeriod.period,
        purchaseQuantity: row.acquisitionQuantity > 0 ? String(row.acquisitionQuantity) : "",
        consumptionQuantity: row.consumptionQuantity > 0 ? String(row.consumptionQuantity) : "",
        location: row.locationName,
        memo: purposeLabel,
      },
    };
  });

  const supplementPageCount = Math.max(1, Math.ceil(supplementRows.length / 10));

  return {
    mainFields,
    supplementRows,
    supplementPageCount,
  };
}
