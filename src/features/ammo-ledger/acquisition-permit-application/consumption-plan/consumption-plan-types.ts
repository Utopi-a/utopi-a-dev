import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";

export type RangeAllocation = {
  rangeId: string;
  rangeName: string;
  rangeAddress: string;
  purpose: AcquisitionPermitPurpose;
  weight: number;
};

export type AcquisitionEvent = {
  date: string;
  quantity: number;
};

export type ConsumptionEvent = {
  date: string;
  quantity: number;
  rangeId: string;
  rangeName: string;
  rangeAddress: string;
  purpose: AcquisitionPermitPurpose;
};

export type ConsumptionPlanRow = {
  rowIndex: number;
  date: string;
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
