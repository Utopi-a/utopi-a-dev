"use client";

import type { ConsumptionPlan } from "../../consumption-plan/consumption-plan-types";
import { formatPlanPeriodLabel } from "../../consumption-plan/plan-period/plan-period";

type ConsumptionPlanPreviewProps = {
  plan: ConsumptionPlan | null;
};

export function ConsumptionPlanPreview({ plan }: ConsumptionPlanPreviewProps) {
  if (!plan) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p>
          譲受合計: {plan.totalAcquisition.toLocaleString("ja-JP")}発 / 消費合計:{" "}
          {plan.totalConsumption.toLocaleString("ja-JP")}発 / ピーク在庫:{" "}
          {plan.peakHomeStock.toLocaleString("ja-JP")}発
        </p>
      </div>

      {plan.warnings.length > 0 ? (
        <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
          {plan.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {plan.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">予定時期</th>
                <th className="px-3 py-2">種別</th>
                <th className="px-3 py-2">場所</th>
                <th className="px-3 py-2 text-right">購入</th>
                <th className="px-3 py-2 text-right">消費</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((row) => (
                <tr key={row.rowIndex} className="border-t border-border/50">
                  <td className="px-3 py-2">{row.rowIndex}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatPlanPeriodLabel({ value: row.scheduledPeriod })}
                  </td>
                  <td className="px-3 py-2">{row.isAcquisition ? "購入" : "消費"}</td>
                  <td className="px-3 py-2">{row.locationName}</td>
                  <td className="px-3 py-2 text-right">
                    {row.acquisitionQuantity > 0 ? row.acquisitionQuantity : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.consumptionQuantity > 0 ? row.consumptionQuantity : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
