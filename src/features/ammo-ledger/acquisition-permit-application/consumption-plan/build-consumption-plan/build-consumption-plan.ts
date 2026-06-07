import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import {
  compareTimelinePosition,
  serializeConsumptionSlotKey,
} from "../consumption-plan-timeline/consumption-plan-timeline";
import type {
  AcquisitionEvent,
  BuildConsumptionPlanInput,
  ConsumptionEvent,
  ConsumptionPlan,
  ConsumptionPlanRow,
} from "../consumption-plan-types";
import { computeBufferNeedByAcquisition } from "../merge-consumptions/merge-consumptions";
import { comparePlanPeriod } from "../plan-period/plan-period";
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
  if (rangeAllocations.length === 0) {
    return {
      rows: [],
      warnings: ["射撃場を1件以上指定してください"],
      peakHomeStock: currentHomeStock,
      totalAcquisition: 0,
      totalConsumption: 0,
    };
  }

  if (requestedQuantity % purchaseUnit !== 0) {
    return {
      rows: [],
      warnings: [`申請数量は ${purchaseUnit} 発単位（250, 500, 750…）で指定してください`],
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
  });

  const minimumBufferNeed = computeBufferNeedByAcquisition({
    initialStock: currentHomeStock,
    homeStorageLimit,
    acquisitions,
    shootingConsumptions: [],
    bufferConsumptions: [],
    consumptionUnit,
  });
  const minimumBufferTotal = sumNumbers({ values: minimumBufferNeed });

  if (minimumBufferTotal > requestedQuantity) {
    return {
      rows: [],
      warnings: [
        `自宅在庫 ${currentHomeStock} 発の状態では、申請数量 ${requestedQuantity} 発では保管上限 ${homeStorageLimit} 発を守れません（最低 ${minimumBufferTotal} 発の消費が必要）`,
      ],
      peakHomeStock: currentHomeStock,
      totalAcquisition: 0,
      totalConsumption: 0,
    };
  }

  const bufferNeedByAcquisition = minimumBufferNeed;
  const shootingQuantity = requestedQuantity - minimumBufferTotal;
  const scheduled = scheduleConsumptionsFromAcquisitions({
    acquisitions,
    requestedQuantity,
    shootingQuantity,
    bufferNeedByAcquisition,
    periodFrom,
    periodTo,
    rangeAllocations,
    consumptionUnit,
  });

  const baseConsumptions = scheduled.shootingConsumptions;
  const bufferConsumptions = scheduled.bufferConsumptions;
  const displayConsumptions = mergeBufferAndShootingSamePeriod({
    bufferConsumptions,
    shootingConsumptions: baseConsumptions,
  });

  const rows = mergeEventsIntoRows({
    acquisitions,
    consumptions: displayConsumptions,
    counterpartyName,
    counterpartyAddress,
  });

  const simulation = simulateHomeStock({
    initialStock: currentHomeStock,
    acquisitions,
    shootingConsumptions: baseConsumptions,
    bufferConsumptions,
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

  if (sumConsumptionQuantity({ consumptions: baseConsumptions }) < shootingQuantity) {
    warnings.push(
      `購入間の上中下旬枠に割り当て可能な射撃消費が不足しています（${sumConsumptionQuantity({ consumptions: baseConsumptions })} / ${shootingQuantity}）`,
    );
  }

  if (
    hasConsecutivePurchasesWithoutConsumption({
      acquisitions,
      consumptions: displayConsumptions,
    })
  ) {
    warnings.push("消費のないまま購入が連続しています");
  }

  const consumptionsPerGap = countConsumptionsBetweenPurchases({
    consumptions: displayConsumptions,
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

function mergeBufferAndShootingSamePeriod({
  bufferConsumptions,
  shootingConsumptions,
}: {
  bufferConsumptions: ConsumptionEvent[];
  shootingConsumptions: ConsumptionEvent[];
}): ConsumptionEvent[] {
  const merged = new Map<string, ConsumptionEvent>();

  for (const event of [...bufferConsumptions, ...shootingConsumptions]) {
    const key = serializeConsumptionSlotKey({
      period: event.scheduledPeriod,
      slotSequence: event.slotSequence,
    });
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...event });
      continue;
    }

    existing.quantity += event.quantity;
  }

  return [...merged.values()].sort((a, b) =>
    compareTimelinePosition({
      a: { ...a, kind: "consumption" },
      b: { ...b, kind: "consumption" },
    }),
  );
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

function sumConsumptionQuantity({ consumptions }: { consumptions: ConsumptionEvent[] }): number {
  return consumptions.reduce((sum, event) => sum + event.quantity, 0);
}

function sumNumbers({ values }: { values: number[] }): number {
  return values.reduce((sum, value) => sum + value, 0);
}
