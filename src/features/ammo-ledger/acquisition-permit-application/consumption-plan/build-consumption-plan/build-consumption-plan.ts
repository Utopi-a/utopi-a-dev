import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import { compareTimelinePosition } from "../consumption-plan-timeline/consumption-plan-timeline";
import type {
  AcquisitionEvent,
  BuildConsumptionPlanInput,
  ConsumptionEvent,
  ConsumptionPlan,
  ConsumptionPlanRow,
} from "../consumption-plan-types";
import {
  hasConsecutivePurchasesWithoutConsumption,
  scheduleAcquisitions,
} from "../schedule-acquisitions/schedule-acquisitions";
import {
  countConsumptionsBetweenPurchases,
  scheduleConsumptionsFromAcquisitions,
} from "../schedule-consumptions-from-acquisitions/schedule-consumptions-from-acquisitions";
import { simulateHomeStock } from "../simulate-home-stock/simulate-home-stock";
import { validateConsumptionPlan } from "../validate-consumption-plan/validate-consumption-plan";

const defaultPurchaseUnit = 250;
const defaultConsumptionUnit = 25;
const defaultMaxRowsPerPage = 10;
const maxConsumptionsPerGap = 2;

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
  const inputWarnings: string[] = [];
  if (
    !Number.isSafeInteger(purchaseUnit) ||
    purchaseUnit <= 0 ||
    !Number.isSafeInteger(consumptionUnit) ||
    consumptionUnit <= 0 ||
    purchaseUnit % consumptionUnit !== 0 ||
    !Number.isSafeInteger(homeStorageLimit) ||
    homeStorageLimit < purchaseUnit
  ) {
    inputWarnings.push("購入単位・消費単位・保管上限の設定を確認してください");
  }
  if (
    !Number.isSafeInteger(requestedQuantity) ||
    requestedQuantity <= 0 ||
    requestedQuantity % purchaseUnit !== 0
  ) {
    inputWarnings.push(`申請数量は正の ${purchaseUnit} 発単位（250, 500, 750…）で指定してください`);
  }
  if (
    !Number.isSafeInteger(currentHomeStock) ||
    currentHomeStock < 0 ||
    currentHomeStock > homeStorageLimit
  ) {
    inputWarnings.push(`自宅在庫は 0〜${homeStorageLimit} 発の整数で指定してください`);
  }
  if (rangeAllocations.length === 0) {
    inputWarnings.push("射撃場を1件以上指定してください");
  } else if (
    rangeAllocations.some((range) => !Number.isFinite(range.weight) || range.weight <= 0) ||
    !Number.isFinite(rangeAllocations.reduce((sum, range) => sum + range.weight, 0)) ||
    new Set(rangeAllocations.map((range) => range.rangeId)).size !== rangeAllocations.length
  ) {
    inputWarnings.push("射撃場は重複なく指定し、配分比率を正の数にしてください");
  }
  if (inputWarnings.length > 0) {
    return {
      rows: [],
      warnings: inputWarnings,
      peakHomeStock: currentHomeStock,
      totalAcquisition: 0,
      totalConsumption: 0,
    };
  }

  const acquisitions = scheduleAcquisitions({
    requestedQuantity,
    periodFrom,
    periodTo,
    initialStock: currentHomeStock,
    homeStorageLimit,
    purchaseUnit,
    consumptionUnit,
  });

  if (acquisitions.length === 0) {
    return {
      rows: [],
      warnings: ["指定期間・購入単位・在庫の端数では保管上限内の購入を配置できません"],
      peakHomeStock: currentHomeStock,
      totalAcquisition: 0,
      totalConsumption: 0,
    };
  }

  const consumptions = scheduleConsumptionsFromAcquisitions({
    acquisitions,
    initialStock: currentHomeStock,
    homeStorageLimit,
    rangeAllocations,
    consumptionUnit,
  });

  const rows = mergeEventsIntoRows({
    acquisitions,
    consumptions,
    counterpartyName,
    counterpartyAddress,
  });

  const simulation = simulateHomeStock({
    initialStock: currentHomeStock,
    acquisitions,
    shootingConsumptions: consumptions,
  });

  const totalAcquisition = rows.reduce((sum, row) => sum + row.acquisitionQuantity, 0);
  const totalConsumption = rows.reduce((sum, row) => sum + row.consumptionQuantity, 0);

  const warnings = validateConsumptionPlan({
    rows,
    requestedQuantity,
    purchaseUnit,
    consumptionUnit,
    homeStorageLimit,
    peakHomeStock: simulation.peakHomeStock,
    maxRowsPerPage: defaultMaxRowsPerPage,
  });

  if (
    hasConsecutivePurchasesWithoutConsumption({
      acquisitions,
      consumptions,
    })
  ) {
    warnings.push("消費のないまま購入が連続しています");
  }

  const consumptionsPerGap = countConsumptionsBetweenPurchases({
    consumptions,
    acquisitions,
  });

  if (consumptionsPerGap.some((count) => count === 0)) {
    warnings.push("購入と購入の間に消費がありません");
  }
  if (consumptionsPerGap.some((count) => count > maxConsumptionsPerGap)) {
    warnings.push(`購入と購入の間の消費が ${maxConsumptionsPerGap} 回を超えています`);
  }

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
  type PendingRow = ConsumptionPlanRow & {
    kind: "acquisition" | "consumption";
    slotSequence?: number;
    eventSequence?: number;
  };

  const pendingRows: PendingRow[] = [];

  for (const consumption of consumptions) {
    pendingRows.push({
      rowIndex: 0,
      scheduledPeriod: consumption.scheduledPeriod,
      locationName: consumption.rangeName,
      locationAddress: consumption.rangeAddress,
      purpose: consumption.purpose,
      consumptionQuantity: consumption.quantity,
      acquisitionQuantity: 0,
      isAcquisition: false,
      kind: "consumption",
      slotSequence: consumption.slotSequence,
      eventSequence: consumption.eventSequence,
    });
  }

  for (const acquisition of acquisitions) {
    pendingRows.push({
      rowIndex: 0,
      scheduledPeriod: acquisition.scheduledPeriod,
      locationName: counterpartyName,
      locationAddress: counterpartyAddress,
      purpose: consumptions[0]?.purpose ?? "標的射撃",
      consumptionQuantity: 0,
      acquisitionQuantity: acquisition.quantity,
      isAcquisition: true,
      kind: "acquisition",
      slotSequence: acquisition.slotSequence,
    });
  }

  return pendingRows
    .sort((a, b) =>
      compareTimelinePosition({
        a: {
          scheduledPeriod: a.scheduledPeriod,
          slotSequence: a.slotSequence,
          eventSequence: a.eventSequence,
          kind: a.kind,
        },
        b: {
          scheduledPeriod: b.scheduledPeriod,
          slotSequence: b.slotSequence,
          eventSequence: b.eventSequence,
          kind: b.kind,
        },
      }),
    )
    .map(
      (
        { kind: _kind, slotSequence: _slotSequence, eventSequence: _eventSequence, ...row },
        index,
      ) => ({
        ...row,
        rowIndex: index + 1,
      }),
    );
}
