import type {
  ApplicationFieldValues,
  SupplementRowFieldValues,
} from "@/features/ammo-ledger/acquisition-permit-application/form-template/form-template-types";
import type {
  GunApplicationGunEntry,
  GunPermitApplicationInput,
  GunPermitGunCategory,
  GunPermitPurpose,
} from "../gun-possession-permit-application-types";
import { splitDateParts } from "../gun-possession-permit-application-types";

export type BuiltGunPermitFieldValues = {
  mainFields: ApplicationFieldValues;
  supplementGunPages: Array<{
    gunIndex: number;
    frontFields: ApplicationFieldValues;
    backFields: ApplicationFieldValues;
  }>;
  renewalSupplementRows: SupplementRowFieldValues[];
};

function checkbox({ checked }: { checked: boolean }): string {
  return checked ? "✓" : "";
}

function resolvePurposeFields({ purpose }: { purpose: GunPermitPurpose }): ApplicationFieldValues {
  return {
    purposeHunting: checkbox({ checked: purpose === "hunting" }),
    purposeHarmfulBirdBeast: checkbox({ checked: purpose === "harmful_bird_beast" }),
    purposeTargetShooting: checkbox({ checked: purpose === "target_shooting" }),
  };
}

function resolveGunCategoryFields({
  category,
}: {
  category: GunPermitGunCategory;
}): ApplicationFieldValues {
  return {
    gunCategoryRifle: checkbox({ checked: category === "rifle" }),
    gunCategoryShotgun: checkbox({ checked: category === "shotgun" }),
    gunCategoryAirRifle: checkbox({ checked: category === "air_rifle" }),
    gunCategoryHuntingRifleOther: checkbox({ checked: category === "hunting_rifle_other" }),
  };
}

function buildApplicantMainFields({
  input,
}: {
  input: GunPermitApplicationInput;
}): ApplicationFieldValues {
  const applicationDate = splitDateParts({ value: input.applicationDate });
  const birthDate = input.ownerBirthDate ? splitDateParts({ value: input.ownerBirthDate }) : null;

  return {
    prefectureName: input.prefectureName,
    applicationDateYear: applicationDate.year,
    applicationDateMonth: applicationDate.month,
    applicationDateDay: applicationDate.day,
    ownerRegisteredDomicile: input.ownerRegisteredDomicile ?? "",
    ownerAddress: input.ownerAddress,
    ownerFurigana: input.ownerFurigana ?? "",
    ownerName: input.ownerName,
    ownerBirthDateYear: birthDate?.year ?? "",
    ownerBirthDateMonth: birthDate?.month ?? "",
    ownerBirthDateDay: birthDate?.day ?? "",
    ownerPhone: input.ownerPhone ?? "",
    applicationCount: String(input.applicationCount),
    existingPermitDate: input.existingPermitDate ?? "",
    existingPermitNumber: input.existingPermitNumber ?? "",
    lectureCertificateDate: input.lectureCertificateDate ?? "",
    teachingCertificateDate: input.teachingCertificateDate ?? "",
    skillLectureCertificateDate: input.skillLectureCertificateDate ?? "",
    cohabitantNone: checkbox({ checked: !input.hasCohabitants }),
    cohabitantCount: input.hasCohabitants ? String(input.cohabitantCount ?? "") : "",
    pledgeDisqualification: checkbox({ checked: input.pledgeDisqualification }),
    pledgeHuntingDisqualification: checkbox({
      checked: input.pledgeHuntingDisqualification ?? false,
    }),
    omitCohabitantForm: checkbox({ checked: input.omitCohabitantForm ?? false }),
    omitCohabitantFormDate: input.omitCohabitantFormDate ?? "",
    omitMunicipalCertificate: checkbox({ checked: input.omitMunicipalCertificate ?? false }),
    omitMunicipalCertificateDate: input.omitMunicipalCertificateDate ?? "",
    omitResidentRecord: checkbox({ checked: input.omitResidentRecord ?? false }),
    omitResidentRecordDate: input.omitResidentRecordDate ?? "",
    omitResume: checkbox({ checked: input.omitResume ?? false }),
    omitResumeDate: input.omitResumeDate ?? "",
  };
}

function buildGunSupplementFields({
  gun,
  gunIndex,
}: {
  gun: GunApplicationGunEntry;
  gunIndex: number;
}): { frontFields: ApplicationFieldValues; backFields: ApplicationFieldValues } {
  return {
    frontFields: {
      gunIndexLabel: `${gunIndex + 1}／${gunIndex + 1}`,
      gunType: gun.gunType,
      gunModel: gun.model,
      gunNumber: gun.gunNumber,
      makerName: gun.makerName ?? "",
      totalLengthCm: gun.totalLengthCm ?? "",
      barrelLengthCm: gun.barrelLengthCm ?? "",
      caliber: gun.caliber ?? "",
      purposeDetail: gun.purposeDetail ?? "",
      transferorAddress: gun.transferorAddress ?? "",
      transferorName: gun.transferorName ?? "",
      transferorPhone: gun.transferorPhone ?? "",
      sameAsTransferConsent: checkbox({ checked: gun.sameAsTransferConsent ?? false }),
      ...resolvePurposeFields({ purpose: gun.purpose }),
    },
    backFields: {},
  };
}

function buildRenewalSupplementRows({
  guns,
}: {
  guns: GunApplicationGunEntry[];
}): SupplementRowFieldValues[] {
  return guns.map((gun, index) => {
    const permitDate = gun.permitDate ? splitDateParts({ value: gun.permitDate }) : null;
    return {
      rowIndex: index,
      values: {
        ...resolveGunCategoryFields({ category: gun.gunCategory }),
        permitNumber: gun.permitNumber ?? "",
        permitDateYear: permitDate?.year ?? "",
        permitDateMonth: permitDate?.month ?? "",
        permitDateDay: permitDate?.day ?? "",
      },
    };
  });
}

export function buildGunPermitFieldValues({
  input,
}: {
  input: GunPermitApplicationInput;
}): BuiltGunPermitFieldValues {
  const mainFields = buildApplicantMainFields({ input });
  const supplementGunPages = input.guns.map((gun, gunIndex) => ({
    gunIndex,
    ...buildGunSupplementFields({ gun, gunIndex }),
  }));
  const renewalSupplementRows = buildRenewalSupplementRows({ guns: input.guns });

  return {
    mainFields,
    supplementGunPages,
    renewalSupplementRows,
  };
}
