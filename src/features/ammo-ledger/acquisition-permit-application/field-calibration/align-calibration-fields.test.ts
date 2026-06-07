import { describe, expect, it } from "vitest";
import { alignCalibrationFields } from "./align-calibration-fields";

describe("alignCalibrationFields", () => {
  const fields = [
    { id: "a", page: 0, x: 10, y: 20, width: 10, height: 4, fontSize: 3 },
    { id: "b", page: 0, x: 30, y: 24, width: 10, height: 4, fontSize: 3 },
    { id: "c", page: 0, x: 18, y: 40, width: 10, height: 4, fontSize: 3 },
  ];

  it("左揃えで x を最小値に揃える", () => {
    const aligned = alignCalibrationFields({
      fields,
      selectedIds: ["a", "b", "c"],
      mode: "left",
    });

    expect(aligned.find((field) => field.id === "a")?.x).toBe(10);
    expect(aligned.find((field) => field.id === "b")?.x).toBe(10);
    expect(aligned.find((field) => field.id === "c")?.x).toBe(10);
  });

  it("横均等配置で左端 x を等間隔にする", () => {
    const aligned = alignCalibrationFields({
      fields,
      selectedIds: ["a", "b", "c"],
      mode: "distribute-horizontal",
    });

    expect(aligned.find((field) => field.id === "a")?.x).toBe(10);
    expect(aligned.find((field) => field.id === "c")?.x).toBe(20);
    expect(aligned.find((field) => field.id === "b")?.x).toBe(30);
  });
});
