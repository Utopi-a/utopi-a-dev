import { describe, expect, it } from "vitest";
import { buildInventoryOverview } from "./build-inventory-overview";

describe("buildInventoryOverview", () => {
  it("弾種・号数・グループ・合計を集計する", () => {
    const result = buildInventoryOverview({
      items: [
        {
          ammoTypeId: "a1",
          ammoTypeName: "AA 7.5号",
          gaugeNumber: "7.5",
          defaultPurpose: "shooting",
          roundsPerBox: 25,
          bookStock: 100,
        },
        {
          ammoTypeId: "a2",
          ammoTypeName: "スキート 9号",
          gaugeNumber: "9",
          defaultPurpose: "shooting",
          roundsPerBox: 25,
          bookStock: 50,
        },
        {
          ammoTypeId: "a3",
          ammoTypeName: "スキート 9.5号",
          gaugeNumber: "9.5",
          defaultPurpose: "shooting",
          roundsPerBox: 25,
          bookStock: 75,
        },
      ],
    });

    expect(result.totalStock).toBe(225);
    expect(result.byGauge).toEqual(
      expect.arrayContaining([
        { gaugeKey: "7.5", label: "7.5号", bookStock: 100 },
        { gaugeKey: "9", label: "9号", bookStock: 50 },
        { gaugeKey: "9.5", label: "9.5号", bookStock: 75 },
      ]),
    );
    expect(result.byGaugeGroup).toEqual([
      { groupId: "7.5", label: "7.5号", bookStock: 100 },
      { groupId: "9-9.5", label: "9号・9.5号", bookStock: 125 },
    ]);
  });
});
