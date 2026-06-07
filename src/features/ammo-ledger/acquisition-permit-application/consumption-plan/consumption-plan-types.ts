import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import type { PlanPeriod } from "./plan-period/plan-period";

export type RangeAllocation = {
  rangeId: string;
  rangeName: string;
  rangeAddress: string;
  purpose: AcquisitionPermitPurpose;
  weight: number;
};

export type AcquisitionEvent = {
  scheduledPeriod: PlanPeriod;
  quantity: number;
  /** 同一上中下旬内の並び順（0 始まり） */
  slotSequence?: number;
};

export type ConsumptionEvent = {
  scheduledPeriod: PlanPeriod;
  quantity: number;
  rangeId: string;
  rangeName: string;
  rangeAddress: string;
  purpose: AcquisitionPermitPurpose;
  /** 購入スロットと揃える。同一スロット内の複数消費は eventSequence で区別 */
  slotSequence?: number;
  eventSequence?: number;
};

export type ConsumptionPlanRow = {
  rowIndex: number;
  scheduledPeriod: PlanPeriod;
  locationName: string;
  locationAddress: string;
  purpose: AcquisitionPermitPurpose;
  consumptionQuantity: number;
  acquisitionQuantity: number;
  /** 購入行なら true（譲受店）、消費行なら false（射撃場） */
  isAcquisition: boolean;
};

export type ConsumptionPlan = {
  rows: ConsumptionPlanRow[];
  warnings: string[];
  peakHomeStock: number;
  totalAcquisition: number;
  totalConsumption: number;
};

export type BuildConsumptionPlanInput = {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  currentHomeStock: number;
  rangeAllocations: RangeAllocation[];
  counterpartyName: string;
  counterpartyAddress: string;
  purchaseUnit?: number;
  consumptionUnit?: number;
  homeStorageLimit?: number;
};
