import { describe, expect, it } from "vitest";
import { duplicateSelectedFields, repeatSelectedFieldLayout } from "./duplicate-calibration-fields";

describe("duplicate-calibration-fields", () => {
  const fields = [
    { id: "year", page: 0, x: 10, y: 20, width: 10, height: 4, fontSize: 2.5 },
    { id: "month", page: 0, x: 30, y: 20, width: 8, height: 4, fontSize: 2.5 },
  ];

  it("選択要素を複製する", () => {
    const result = duplicateSelectedFields({
      fields,
      selectedIds: ["year", "month"],
    });

    expect(result.fields).toHaveLength(4);
    expect(result.newIds).toHaveLength(2);
    expect(result.fields.some((field) => field.id === "year_copy")).toBe(true);
  });

  it("選択レイアウトを縦方向に繰り返す", () => {
    const result = repeatSelectedFieldLayout({
      fields,
      selectedIds: ["year", "month"],
      repeatCount: 2,
      offsetY: 10,
    });

    expect(result.fields).toHaveLength(6);
    expect(result.fields.find((field) => field.id === "year_r1")?.y).toBe(30);
    expect(result.fields.find((field) => field.id === "year_r2")?.y).toBe(40);
  });
});
