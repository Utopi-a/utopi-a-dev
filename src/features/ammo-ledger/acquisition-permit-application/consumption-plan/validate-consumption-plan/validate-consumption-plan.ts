import type { ConsumptionPlanRow } from "../consumption-plan-types";
import { formatPlanPeriodLabel } from "../plan-period/plan-period";

export type ValidateConsumptionPlanInput = {
  rows: ConsumptionPlanRow[];
  requestedQuantity: number;
  purchaseUnit: number;
  consumptionUnit: number;
  homeStorageLimit: number;
  peakHomeStock: number;
  maxRowsPerPage?: number;
};

export function validateConsumptionPlan({
  rows,
  requestedQuantity,
  purchaseUnit,
  consumptionUnit,
  homeStorageLimit,
  peakHomeStock,
  maxRowsPerPage = 12,
}: ValidateConsumptionPlanInput): string[] {
  const warnings: string[] = [];

  const totalAcquisition = rows.reduce((sum, row) => sum + row.acquisitionQuantity, 0);
  const totalConsumption = rows.reduce((sum, row) => sum + row.consumptionQuantity, 0);

  if (totalAcquisition !== requestedQuantity) {
    warnings.push(
      `譲受数量の合計が申請数量と一致しません（${totalAcquisition} / ${requestedQuantity}）`,
    );
  }

  if (totalConsumption !== requestedQuantity) {
    warnings.push(
      `消費数量の合計が申請数量と一致しません（${totalConsumption} / ${requestedQuantity}）`,
    );
  }

  for (const row of rows) {
    if (row.acquisitionQuantity > 0 && row.acquisitionQuantity % purchaseUnit !== 0) {
      warnings.push(
        `${formatPlanPeriodLabel({ value: row.scheduledPeriod })} の譲受数量 ${row.acquisitionQuantity} は ${purchaseUnit} 発単位ではありません`,
      );
    }
    if (row.consumptionQuantity > 0 && row.consumptionQuantity % consumptionUnit !== 0) {
      warnings.push(
        `${formatPlanPeriodLabel({ value: row.scheduledPeriod })} の消費数量 ${row.consumptionQuantity} は ${consumptionUnit} 発単位ではありません`,
      );
    }
  }

  if (peakHomeStock > homeStorageLimit) {
    warnings.push(
      `自宅保管のピークが ${peakHomeStock} 発で、上限 ${homeStorageLimit} 発を超えています`,
    );
  }

  if (rows.length > maxRowsPerPage) {
    warnings.push(
      `別紙1枚あたり ${maxRowsPerPage} 行を超えるため、複数ページが必要です（${rows.length} 行）`,
    );
  }

  return warnings;
}
