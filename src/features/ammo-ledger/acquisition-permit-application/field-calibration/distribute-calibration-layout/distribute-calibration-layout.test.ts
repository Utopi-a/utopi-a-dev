import { describe, expect, it } from "vitest";
import {
  buildEvenlySpacedValues,
  buildEvenYDistributionPatches,
  computeRowHeightFromFieldAnchors,
} from "./distribute-calibration-layout";

describe("buildEvenlySpacedValues", () => {
  it("count 件の等間隔値を返す", () => {
    expect(buildEvenlySpacedValues({ start: 50, end: 69, count: 3 })).toEqual([50, 59.5, 69]);
  });
});

describe("buildEvenYDistributionPatches", () => {
  const fields = [
    { id: "a", page: 0, x: 1, y: 50, fontSize: 3 },
    { id: "b", page: 0, x: 1, y: 55, fontSize: 3 },
    { id: "c", page: 0, x: 1, y: 69, fontSize: 3 },
  ];

  it("選択数と個数が一致すると y を均等配置する", () => {
    const patches = buildEvenYDistributionPatches({
      fields,
      selectedIds: ["a", "b", "c"],
      count: 3,
    });

    expect(patches).toEqual([
      { fieldId: "a", patch: { y: 50 } },
      { fieldId: "b", patch: { y: 59.5 } },
      { fieldId: "c", patch: { y: 69 } },
    ]);
  });

  it("選択数と個数が一致しない場合は null", () => {
    expect(
      buildEvenYDistributionPatches({
        fields,
        selectedIds: ["a", "c"],
        count: 3,
      }),
    ).toBeNull();
  });
});

describe("computeRowHeightFromFieldAnchors", () => {
  it("2点と行数から startY / rowHeight を算出する", () => {
    const result = computeRowHeightFromFieldAnchors({
      fields: [
        { id: "top", page: 0, x: 1, y: 50, fontSize: 3 },
        { id: "second", page: 0, x: 1, y: 69, fontSize: 3 },
      ],
      selectedIds: ["top", "second"],
      rowCount: 10,
    });

    expect(result).toEqual({ startY: 50, rowHeight: 2.11 });
  });
});
