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
const defaultMaxRowsPerPage = 12;

export function buildConsumptionPlan({
  requestedQuantity,
  periodFrom,
  periodTo,
  currentHomeStock,
  rangeAllocations,
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
}: {
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
}): ConsumptionPlanRow[] {
  const rowMap = new Map<string, ConsumptionPlanRow>();

  for (const acquisition of acquisitions) {
    const key = `${acquisition.date}::acquisition`;
    const existing = rowMap.get(key);
    if (existing) {
      existing.acquisitionQuantity += acquisition.quantity;
      continue;
    }

    rowMap.set(key, {
      rowIndex: 0,
      date: acquisition.date,
      locationName: "",
      locationAddress: "",
      purpose: consumptions[0]?.purpose ?? "標的射撃",
      consumptionQuantity: 0,
      acquisitionQuantity: acquisition.quantity,
    });
  }

  for (const consumption of consumptions) {
    const key = `${consumption.date}::${consumption.rangeId}`;
    const existing = rowMap.get(key);
    if (existing) {
      existing.consumptionQuantity += consumption.quantity;
      continue;
    }

    rowMap.set(key, {
      rowIndex: 0,
      date: consumption.date,
      locationName: consumption.rangeName,
      locationAddress: consumption.rangeAddress,
      purpose: consumption.purpose,
      consumptionQuantity: consumption.quantity,
      acquisitionQuantity: 0,
    });
  }

  return [...rowMap.values()]
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) {
        return byDate;
      }
      if (a.acquisitionQuantity > 0 && b.consumptionQuantity > 0) {
        return -1;
      }
      if (a.consumptionQuantity > 0 && b.acquisitionQuantity > 0) {
        return 1;
      }
      return a.locationName.localeCompare(b.locationName);
    })
    .map((row, index) => ({ ...row, rowIndex: index + 1 }));
}
