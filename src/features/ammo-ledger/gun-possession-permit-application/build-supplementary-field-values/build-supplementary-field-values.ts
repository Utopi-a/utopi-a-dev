import type {
  ApplicationFieldValues,
  SupplementRowFieldValues,
} from "@/features/ammo-ledger/acquisition-permit-application/form-template/form-template-types";
import type { GunPermitApplicationInput } from "../gun-possession-permit-application-types";
import { splitDateParts } from "../gun-possession-permit-application-types";

function checkbox({ checked }: { checked: boolean }): string {
  return checked ? "✓" : "";
}

function splitYearMonth({ value }: { value: string }): { year: string; month: string } {
  const [year, month] = value.split("-");
  return { year: String(Number(year)), month: String(Number(month)) };
}

export type BuiltSupplementaryFieldValues = {
  resumeMainFields: ApplicationFieldValues;
  resumeWorkRows: SupplementRowFieldValues[];
  resumeAddressRows: SupplementRowFieldValues[];
  cohabitantMainFields: ApplicationFieldValues;
  cohabitantRows: SupplementRowFieldValues[];
};

export function buildSupplementaryFieldValues({
  input,
}: {
  input: GunPermitApplicationInput;
}): BuiltSupplementaryFieldValues | null {
  const applicationDate = splitDateParts({ value: input.applicationDate });
  const resume = input.resume;
  const cohabitants = input.cohabitants;

  if (!resume && (!cohabitants || cohabitants.length === 0)) {
    return null;
  }

  const resumeMainFields: ApplicationFieldValues = {
    applicationDateYear: applicationDate.year,
    applicationDateMonth: applicationDate.month,
    applicationDateDay: applicationDate.day,
    ownerName: input.ownerName,
    hasCriminalRecordYes: checkbox({ checked: resume?.hasCriminalRecord ?? false }),
    hasCriminalRecordNo: checkbox({ checked: !(resume?.hasCriminalRecord ?? false) }),
    hasTreatmentHistoryYes: checkbox({ checked: resume?.hasTreatmentHistory ?? false }),
    hasTreatmentHistoryNo: checkbox({ checked: !(resume?.hasTreatmentHistory ?? false) }),
    criminalRecordDetail: resume?.criminalRecordDetail ?? "",
  };

  const resumeWorkRows: SupplementRowFieldValues[] =
    resume?.workHistory.map((entry, rowIndex) => {
      const from = splitYearMonth({ value: entry.from });
      const to = splitYearMonth({ value: entry.to });
      return {
        rowIndex,
        values: {
          periodFrom: `${from.year}年${from.month}月`,
          periodTo: `${to.year}年${to.month}月`,
          content: entry.employer,
        },
      };
    }) ?? [];

  const resumeAddressRows: SupplementRowFieldValues[] =
    resume?.addressHistory.map((entry, rowIndex) => {
      const from = splitYearMonth({ value: entry.from });
      const to = splitYearMonth({ value: entry.to });
      return {
        rowIndex,
        values: {
          periodFrom: `${from.year}年${from.month}月`,
          periodTo: `${to.year}年${to.month}月`,
          content: entry.address,
        },
      };
    }) ?? [];

  const cohabitantMainFields: ApplicationFieldValues = {
    applicationDateYear: applicationDate.year,
    applicationDateMonth: applicationDate.month,
    applicationDateDay: applicationDate.day,
    ownerName: input.ownerName,
  };

  const cohabitantRows: SupplementRowFieldValues[] =
    cohabitants?.map((entry, rowIndex) => {
      const birthDate = entry.birthDate ? splitDateParts({ value: entry.birthDate }) : null;
      return {
        rowIndex,
        values: {
          sameRegisteredDomicile: checkbox({ checked: entry.sameRegisteredDomicile ?? false }),
          furigana: entry.furigana ?? "",
          occupation: entry.occupation ?? "",
          name: entry.name,
          relationship: entry.relationship,
          birthDateYear: birthDate?.year ?? "",
          birthDateMonth: birthDate?.month ?? "",
          birthDateDay: birthDate?.day ?? "",
        },
      };
    }) ?? [];

  return {
    resumeMainFields,
    resumeWorkRows,
    resumeAddressRows,
    cohabitantMainFields,
    cohabitantRows,
  };
}
