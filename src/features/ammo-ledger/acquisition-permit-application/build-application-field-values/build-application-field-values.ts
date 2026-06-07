import type { AcquisitionPermitApplicationInput } from "../acquisition-permit-application-types";
import { splitDateParts } from "../acquisition-permit-application-types";
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

function extractPermitCertificateNumber({ value }: { value: string }): string {
  const matched = value.match(/第?\s*([0-9０-９]+)\s*号?/);
  if (matched) {
    return matched[1];
  }
  return value.trim();
}

export function buildApplicationFieldValues({
  input,
}: {
  input: AcquisitionPermitApplicationInput;
}): BuiltApplicationFieldValues {
  const applicationDate = splitDateParts({ value: input.applicationDate });
  const birthDate = input.ownerBirthDate ? splitDateParts({ value: input.ownerBirthDate }) : null;
  const validFrom = splitDateParts({ value: input.validFrom });
  const validTo = splitDateParts({ value: input.validTo });
  const gunType = input.gunType ?? input.gunTypeAndCaliber ?? "";
  const compatibleAmmunition = input.compatibleAmmunition ?? input.ammoName;
  const permitCertificateNumber = input.gunPermitNumber
    ? extractPermitCertificateNumber({ value: input.gunPermitNumber })
    : "";

  const mainFields: ApplicationFieldValues = {
    prefectureName: input.prefectureName,
    applicationDateYear: applicationDate.year,
    applicationDateMonth: applicationDate.month,
    applicationDateDay: applicationDate.day,
    ownerAddress: input.ownerAddress,
    ownerFurigana: input.ownerFurigana ?? "",
    ownerName: input.ownerName,
    ownerBirthDateYear: birthDate?.year ?? "",
    ownerBirthDateMonth: birthDate?.month ?? "",
    ownerBirthDateDay: birthDate?.day ?? "",
    ownerPhone: input.ownerPhone ?? "",
    ammoName: input.ammoName,
    requestedQuantity: `${input.requestedQuantity}`,
    currentHomeStock:
      input.currentHomeStockDetail ??
      `${input.ammoName} ${input.currentHomeStock.toLocaleString("ja-JP")}個`,
    gunType,
    compatibleAmmunition,
    certificateTypeGunPossessionPermit: permitCertificateNumber ? "✓" : "",
    permitCertificateNumber,
    permitPurpose: input.permitPurpose,
    validFromYear: validFrom.year,
    validFromMonth: validFrom.month,
    validFromDay: validFrom.day,
    validToYear: validTo.year,
    validToMonth: validTo.month,
    validToDay: validTo.day,
    storageLocation: input.storageLocation,
  };

  const supplementRows = input.consumptionPlan.rows.map((row: ConsumptionPlanRow) => {
    const purposeLabel = row.isAcquisition ? "購入" : row.purpose;
    const locationText = row.isAcquisition
      ? row.locationName
      : `${row.locationName}（${row.locationAddress}）`;

    return {
      rowIndex: row.rowIndex,
      values: {
        year: String(row.scheduledPeriod.year),
        month: String(row.scheduledPeriod.month),
        period: row.scheduledPeriod.period,
        purchaseQuantity: row.acquisitionQuantity > 0 ? String(row.acquisitionQuantity) : "",
        consumptionQuantity: row.consumptionQuantity > 0 ? String(row.consumptionQuantity) : "",
        location: locationText,
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
