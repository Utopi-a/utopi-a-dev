import { describe, expect, it } from "vitest";
import {
  applyGroupMoveDelta,
  applyGroupNudge,
  buildGroupMoveOrigins,
  resolveGroupMoveIds,
} from "./move-selected-fields";

describe("move-selected-fields", () => {
  const fields = [
    { id: "year", page: 0, x: 10, y: 20, width: 10, height: 4, fontSize: 2.5 },
    { id: "month", page: 0, x: 30, y: 20, width: 8, height: 4, fontSize: 2.5 },
    { id: "day", page: 0, x: 50, y: 20, width: 8, height: 4, fontSize: 2.5 },
  ];

  it("複数選択中はグループ移動対象を返す", () => {
    expect(
      resolveGroupMoveIds({
        fieldId: "month",
        selectedIds: ["year", "month", "day"],
      }),
    ).toEqual(["year", "month", "day"]);
  });

  it("選択外フィールドは単独移動", () => {
    expect(
      resolveGroupMoveIds({
        fieldId: "day",
        selectedIds: ["year", "month"],
      }),
    ).toEqual(["day"]);
  });

  it("グループ移動で相対位置を保つ", () => {
    const moveIds = ["year", "month"];
    const origins = buildGroupMoveOrigins({ fields, moveIds });
    const moved = applyGroupMoveDelta({ fields, origins, dx: 2, dy: 3 });

    expect(moved.find((field) => field.id === "year")).toEqual({
      ...fields[0],
      x: 12,
      y: 23,
    });
    expect(moved.find((field) => field.id === "month")).toEqual({
      ...fields[1],
      x: 32,
      y: 23,
    });
    expect(moved.find((field) => field.id === "day")).toEqual(fields[2]);
  });

  it("グループ nudge も全選択要素を動かす", () => {
    const moved = applyGroupNudge({
      fields,
      moveIds: ["year", "month"],
      dx: 0.5,
      dy: -0.5,
    });

    expect(moved.find((field) => field.id === "year")?.x).toBe(10.5);
    expect(moved.find((field) => field.id === "month")?.y).toBe(19.5);
    expect(moved.find((field) => field.id === "day")?.x).toBe(50);
  });
});
