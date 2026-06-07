import { describe, expect, it } from "vitest";
import {
  applyCalibrationFieldPatch,
  applyCalibrationFieldPatches,
} from "./apply-repeating-column-patch";
import {
  buildCalibrationPageFields,
  expandRepeatingRowColumnsToFields,
} from "./expand-repeating-row-columns";
import { repeatingCalibrationFieldId } from "./repeating-rows-calibration-ids";
import { serializeRepeatingRows } from "./serialize-repeating-rows";

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

  it("verticalAlign を OverlayFieldDef に展開する", () => {
    const fields = expandRepeatingRowColumnsToFields({
      repeatingRows: {
        ...repeatingRows,
        columns: [{ ...repeatingRows.columns[0], verticalAlign: "center" as const }],
      },
    });

    expect(fields[0]?.verticalAlign).toBe("center");
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

  it("repeating フィールドの height 変更を column.height に反映する", () => {
    const fieldId = repeatingCalibrationFieldId({ columnId: "year" });
    const result = applyCalibrationFieldPatch({
      fields: [],
      repeatingRows,
      fieldId,
      patch: { height: 5.5 },
    });

    expect(result.repeatingRows?.columns[0]?.height).toBe(5.5);
  });

  it("repeating フィールドの verticalAlign を column に反映する", () => {
    const fieldId = repeatingCalibrationFieldId({ columnId: "year" });
    const result = applyCalibrationFieldPatch({
      fields: [],
      repeatingRows,
      fieldId,
      patch: { verticalAlign: "center" },
    });

    expect(result.repeatingRows?.columns[0]?.verticalAlign).toBe("center");
  });

  it("repeating フィールドの verticalAlign 解除を column から削除する", () => {
    const fieldId = repeatingCalibrationFieldId({ columnId: "year" });
    const withVerticalAlign = applyCalibrationFieldPatch({
      fields: [],
      repeatingRows,
      fieldId,
      patch: { verticalAlign: "bottom" },
    });
    const result = applyCalibrationFieldPatch({
      fields: [],
      repeatingRows: withVerticalAlign.repeatingRows,
      fieldId,
      patch: { verticalAlign: undefined },
    });

    expect(result.repeatingRows?.columns[0]?.verticalAlign).toBeUndefined();
  });

  it("複数の repeating 列へ一括 patch を適用する", () => {
    const result = applyCalibrationFieldPatches({
      fields: [],
      repeatingRows,
      patches: [
        {
          fieldId: repeatingCalibrationFieldId({ columnId: "year" }),
          patch: { height: 4.2 },
        },
        {
          fieldId: repeatingCalibrationFieldId({ columnId: "month" }),
          patch: { height: 6.1 },
        },
      ],
    });

    expect(result.repeatingRows?.columns[0]?.height).toBe(4.2);
    expect(result.repeatingRows?.columns[1]?.height).toBe(6.1);
  });
});

describe("serializeRepeatingRows", () => {
  it("verticalAlign と fitText を columns に出力する", () => {
    const serialized = serializeRepeatingRows({
      repeatingRows: {
        startY: 50,
        rowHeight: 19,
        maxRowsPerPage: 10,
        columns: [
          {
            id: "year",
            x: 23,
            width: 20,
            fontSize: 2.8,
            verticalAlign: "center",
            fitText: false,
          },
        ],
      },
    });

    expect(serialized).toContain('verticalAlign: "center"');
    expect(serialized).toContain("fitText: false");
  });
});
