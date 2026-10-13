export type GunPermitApplicationKind = "new" | "addition" | "renewal";

export type GunPermitPurpose = "hunting" | "harmful_bird_beast" | "target_shooting" | "other";

export type GunPermitGunCategory = "rifle" | "shotgun" | "hunting_rifle_other" | "air_rifle";

export type GunApplicationGunEntry = {
  gunCategory: GunPermitGunCategory;
  gunType: string;
  model: string;
  gunNumber: string;
  makerName?: string;
  totalLengthCm?: string;
  barrelLengthCm?: string;
  caliber?: string;
  purpose: GunPermitPurpose;
  purposeDetail?: string;
  transferorAddress?: string;
  transferorName?: string;
  transferorPhone?: string;
  sameAsTransferConsent?: boolean;
  permitNumber?: string;
  permitDate?: string;
};

export type ResumeWorkEntry = {
  from: string;
  to: string;
  employer: string;
};

export type ResumeAddressEntry = {
  from: string;
  to: string;
  address: string;
};

export type ResumeGunHistoryEntry = {
  from: string;
  to: string;
  gunType: string;
  outcome: string;
};

export type CohabitantEntry = {
  furigana?: string;
  occupation?: string;
  name: string;
  relationship: string;
  birthDate?: string;
  sameRegisteredDomicile?: boolean;
};

export type UsageRecordEntry = {
  hasUsage: boolean;
  date?: string;
  location?: string;
  usageDetail?: string;
  companions?: string;
  ammunitionConsumed?: string;
  memo?: string;
  category: "hunting" | "harmful_bird_beast" | "target_shooting";
};

export type GunPermitApplicationInput = {
  kind: GunPermitApplicationKind;
  prefectureName: string;
  applicationDate: string;
  ownerName: string;
  ownerFurigana?: string;
  ownerRegisteredDomicile?: string;
  ownerAddress: string;
  ownerBirthDate?: string;
  ownerPhone?: string;
  applicationCount: number;
  guns: GunApplicationGunEntry[];
  hasExistingPermit: boolean;
  existingPermitSubmittedToSamePrefecture: boolean;
  issuesNewPermitCard: boolean;
  isAge75OrOlder: boolean;
  lectureCertificateDate?: string;
  lectureCertificateIssuer?: string;
  skillLectureCertificateDate?: string;
  teachingCertificateDate?: string;
  existingPermitNumber?: string;
  existingPermitDate?: string;
  hasCohabitants: boolean;
  cohabitantCount?: number;
  omitCohabitantForm?: boolean;
  omitCohabitantFormDate?: string;
  omitMunicipalCertificate?: boolean;
  omitMunicipalCertificateDate?: string;
  omitResidentRecord?: boolean;
  omitResidentRecordDate?: string;
  omitResume?: boolean;
  omitResumeDate?: string;
  pledgeDisqualification: boolean;
  pledgeHuntingDisqualification?: boolean;
  resume?: {
    workHistory: ResumeWorkEntry[];
    addressHistory: ResumeAddressEntry[];
    gunHistory: ResumeGunHistoryEntry[];
    hasCriminalRecord: boolean;
    criminalRecordDetail?: string;
    hasTreatmentHistory: boolean;
  };
  cohabitants?: CohabitantEntry[];
  usageRecords?: UsageRecordEntry[];
};

export type GunPermitApplicationPayload = GunPermitApplicationInput;

export function splitDateParts({ value }: { value: string }): {
  year: string;
  month: string;
  day: string;
} {
  const [year, month, day] = value.split("-");
  return {
    year: String(Number(year)),
    month: String(Number(month)),
    day: String(Number(day)),
  };
}

export function formatJapaneseDate({ value }: { value: string }): string {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}
