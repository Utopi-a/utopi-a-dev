import { describe, expect, it } from "vitest";
import { applyCalibrationFieldPatch } from "./apply-repeating-column-patch";
import {
  buildCalibrationPageFields,
  expandRepeatingRowColumnsToFields,
} from "./expand-repeating-row-columns";
import { repeatingCalibrationFieldId } from "./repeating-rows-calibration-ids";

const repeatingRows = {
  startY: 50,
  rowHeight: 19,
  maxRowsPerPage: 10,
  columns: [
    { id: "year", x: 23, width: 20, fontSize: 2.8, align: "right" as const, yOffset: 1.2 },
    { id: "month", x: 23, width: 20, fontSize: 2.8, align: "right" as const, yOffset: 6.8 },
  ],
};

describe("expandRepeatingRowColumnsToFields", () => {
  it("repeatingRows の列を 1 行目の OverlayFieldDef に展開する", () => {
    const fields = expandRepeatingRowColumnsToFields({ repeatingRows });
    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: repeatingCalibrationFieldId({ columnId: "year" }),
      x: 23,
      y: 51.2,
    });
  });

  it("static fields と repeating 列をページ用フィールドに合成する", () => {
    const pageFields = buildCalibrationPageFields({
      fields: [{ id: "label", page: 0, x: 1, y: 2, fontSize: 3 }],
      repeatingRows,
      pageIndex: 0,
    });

    expect(pageFields.map((field) => field.id)).toEqual([
      "label",
      repeatingCalibrationFieldId({ columnId: "year" }),
      repeatingCalibrationFieldId({ columnId: "month" }),
    ]);
  });
});

describe("applyCalibrationFieldPatch", () => {
  it("repeating フィールドの y 変更を yOffset に反映する", () => {
    const fieldId = repeatingCalibrationFieldId({ columnId: "year" });
    const result = applyCalibrationFieldPatch({
      fields: [],
      repeatingRows,
      fieldId,
      patch: { y: 52.2 },
    });

    expect(result.repeatingRows?.columns[0]?.yOffset).toBe(2.2);
  });
});
