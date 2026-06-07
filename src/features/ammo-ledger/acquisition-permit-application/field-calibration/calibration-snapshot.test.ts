import { describe, expect, it } from "vitest";
import { cloneCalibrationSnapshot, snapshotsEqual } from "./calibration-snapshot";

describe("calibration snapshot", () => {
  it("repeatingRows の列順が違っても同一とみなす", () => {
    const left = {
      fields: [],
      repeatingRows: {
        startY: 50,
        rowHeight: 19,
        maxRowsPerPage: 10,
        columns: [
          { id: "year", x: 23, width: 20, fontSize: 2.8 },
          { id: "month", x: 45, width: 20, fontSize: 2.8, height: 5 },
        ],
      },
    };
    const right = {
      fields: [],
      repeatingRows: {
        startY: 50,
        rowHeight: 19,
        maxRowsPerPage: 10,
        columns: [
          { id: "month", x: 45, width: 20, fontSize: 2.8, height: 5 },
          { id: "year", x: 23, width: 20, fontSize: 2.8 },
        ],
      },
    };

    expect(snapshotsEqual({ left, right })).toBe(true);
  });

  it("clone 後も内容が等価", () => {
    const snapshot = {
      fields: [{ id: "label", page: 0, x: 1, y: 2, fontSize: 3 }],
      repeatingRows: null,
    };

    expect(
      snapshotsEqual({
        left: snapshot,
        right: cloneCalibrationSnapshot({ snapshot }),
      }),
    ).toBe(true);
  });
});
