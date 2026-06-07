import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import type {
  AcquisitionEvent,
  BuildConsumptionPlanInput,
  ConsumptionEvent,
  ConsumptionPlan,
  ConsumptionPlanRow,
} from "../consumption-plan-types";
import { distributeAcquisitions } from "../distribute-acquisitions/distribute-acquisitions";
import { distributeConsumptions } from "../distribute-consumptions/distribute-consumptions";
import {
  rebalanceConsumptionsForHomeStorage,
  simulateHomeStock,
} from "../simulate-home-stock/simulate-home-stock";
import { validateConsumptionPlan } from "../validate-consumption-plan/validate-consumption-plan";

const defaultPurchaseUnit = 250;
const defaultConsumptionUnit = 25;
const defaultMaxRowsPerPage = 10;

export function buildConsumptionPlan({
  requestedQuantity,
  periodFrom,
  periodTo,
  currentHomeStock,
  rangeAllocations,
  counterpartyName,
  counterpartyAddress,
  purchaseUnit = defaultPurchaseUnit,
  consumptionUnit = defaultConsumptionUnit,
  homeStorageLimit = homeStorageRoundLimit,
}: BuildConsumptionPlanInput): ConsumptionPlan {
  if (rangeAllocations.length === 0) {
    return {
      rows: [],
      warnings: ["射撃場を1件以上指定してください"],
      peakHomeStock: currentHomeStock,
      totalAcquisition: 0,
      totalConsumption: 0,
    };
  }

  if (requestedQuantity % consumptionUnit !== 0) {
    return {
      rows: [],
      warnings: [`申請数量は ${consumptionUnit} 発単位で指定してください`],
      peakHomeStock: currentHomeStock,
      totalAcquisition: 0,
      totalConsumption: 0,
    };
  }

  const acquisitions = distributeAcquisitions({
    requestedQuantity,
    periodFrom,
    periodTo,
    purchaseUnit,
  });

  const consumptions = distributeConsumptions({
    requestedQuantity,
    periodFrom,
    periodTo,
    rangeAllocations,
    consumptionUnit,
  });

  const rebalancedConsumptions = rebalanceConsumptionsForHomeStorage({
    initialStock: currentHomeStock,
    homeStorageLimit,
    acquisitions,
    consumptions,
  });

  const rows = mergeEventsIntoRows({
    acquisitions,
    consumptions: rebalancedConsumptions,
    counterpartyName,
    counterpartyAddress,
  });

  const simulation = simulateHomeStock({
    initialStock: currentHomeStock,
    acquisitions,
    consumptions: rebalancedConsumptions,
  });

  const warnings = validateConsumptionPlan({
    rows,
    requestedQuantity,
    purchaseUnit,
    consumptionUnit,
    homeStorageLimit,
    peakHomeStock: simulation.peakHomeStock,
    maxRowsPerPage: defaultMaxRowsPerPage,
  });

  const totalAcquisition = rows.reduce((sum, row) => sum + row.acquisitionQuantity, 0);
  const totalConsumption = rows.reduce((sum, row) => sum + row.consumptionQuantity, 0);

  return {
    rows,
    warnings,
    peakHomeStock: simulation.peakHomeStock,
    totalAcquisition,
    totalConsumption,
  };
}

function mergeEventsIntoRows({
  acquisitions,
  consumptions,
  counterpartyName,
  counterpartyAddress,
}: {
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
  counterpartyName: string;
  counterpartyAddress: string;
}): ConsumptionPlanRow[] {
  const rows: ConsumptionPlanRow[] = [];

  for (const acquisition of acquisitions) {
    rows.push({
      rowIndex: 0,
      date: acquisition.date,
      locationName: counterpartyName,
      locationAddress: counterpartyAddress,
      purpose: consumptions[0]?.purpose ?? "標的射撃",
      consumptionQuantity: 0,
      acquisitionQuantity: acquisition.quantity,
      isAcquisition: true,
    });
  }

  for (const consumption of consumptions) {
    rows.push({
      rowIndex: 0,
      date: consumption.date,
      locationName: consumption.rangeName,
      locationAddress: consumption.rangeAddress,
      purpose: consumption.purpose,
      consumptionQuantity: consumption.quantity,
      acquisitionQuantity: 0,
      isAcquisition: false,
    });
  }

  return rows
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) {
        return byDate;
      }
      if (a.isAcquisition && !b.isAcquisition) {
        return -1;
      }
      if (!a.isAcquisition && b.isAcquisition) {
        return 1;
      }
      return a.locationName.localeCompare(b.locationName);
    })
    .map((row, index) => ({ ...row, rowIndex: index + 1 }));
}
