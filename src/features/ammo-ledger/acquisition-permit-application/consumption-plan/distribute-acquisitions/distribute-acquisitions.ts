import type { AcquisitionEvent } from "../consumption-plan-types";
import { partitionQuantity } from "../partition-quantity/partition-quantity";
import { distributePlanPeriodsEvenly } from "../plan-period/plan-period";

export const preferredPurchaseBatch = 750;

export function distributeAcquisitions({
  requestedQuantity,
  periodFrom,
  periodTo,
  purchaseUnit = 250,
  preferredBatchSize = preferredPurchaseBatch,
}: {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  purchaseUnit?: number;
  preferredBatchSize?: number;
}): AcquisitionEvent[] {
  if (requestedQuantity <= 0) {
    return [];
  }

  const quantities = partitionQuantity({
    totalQuantity: requestedQuantity,
    unit: purchaseUnit,
    preferredBatchSize,
  });

  const scheduledPeriods = distributePlanPeriodsEvenly({
    from: periodFrom,
    to: periodTo,
    count: quantities.length,
  });

  return quantities.map((quantity, index) => ({
    scheduledPeriod: scheduledPeriods[index],
    quantity,
  }));
}
