import { describe, expect, it } from "vitest";
import {
  removeCalibrationFields,
  resolveDeletableCalibrationFieldIds,
} from "./delete-calibration-fields";
import { repeatingCalibrationFieldId } from "./repeating-rows-calibration/repeating-rows-calibration-ids";

describe("resolveDeletableCalibrationFieldIds", () => {
  it("repeating 列は削除対象から除外する", () => {
    expect(
      resolveDeletableCalibrationFieldIds({
        selectedIds: ["label", repeatingCalibrationFieldId({ columnId: "year" })],
      }),
    ).toEqual(["label"]);
  });
});

describe("removeCalibrationFields", () => {
  it("指定 id のフィールドを除く", () => {
    const fields = [
      { id: "keep", page: 0, x: 1, y: 2, fontSize: 3 },
      { id: "marker_copy", page: 0, x: 3, y: 4, fontSize: 3 },
    ];

    expect(removeCalibrationFields({ fields, fieldIds: ["marker_copy"] })).toEqual([fields[0]]);
  });
});
