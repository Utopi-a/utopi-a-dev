import type { AcquisitionPermitName } from "@/features/ammo-ledger/schema/acquisition-permit-name-options";
import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { ConsumptionPlan } from "./consumption-plan/consumption-plan-types";

export type AcquisitionPermitApplicationInput = {
  prefectureName: string;
  applicationDate: string;
  ownerName: string;
  ownerFurigana?: string;
  ownerAddress: string;
  ownerBirthDate?: string;
  ownerPhone?: string;
  ammoName: AcquisitionPermitName;
  requestedQuantity: number;
  currentHomeStock: number;
  currentHomeStockDetail?: string;
  gunTypeAndCaliber?: string;
  gunType?: string;
  compatibleAmmunition?: string;
  gunPermitNumber?: string;
  permitPurpose: AcquisitionPermitPurpose;
  ledgerPurpose: LedgerPurpose;
  validFrom: string;
  validTo: string;
  storageLocation: string;
  counterpartyName: string;
  counterpartyAddress: string;
  consumptionPlan: ConsumptionPlan;
};

export type AcquisitionPermitApplicationPayload = AcquisitionPermitApplicationInput;

export function formatJapaneseDate({ value }: { value: string }): string {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

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
