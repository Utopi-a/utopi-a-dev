import { describe, expect, it } from "vitest";
import { applyFieldResize } from "./apply-field-resize";

describe("applyFieldResize", () => {
  const field = {
    id: "ownerAddress",
    page: 0,
    x: 10,
    y: 20,
    width: 40,
    height: 8,
    fontSize: 3,
  };

  it("右下ハンドルで width / height を広げる", () => {
    expect(
      applyFieldResize({
        field,
        direction: "se",
        dx: 2,
        dy: 1,
      }),
    ).toEqual({
      width: 42,
      height: 9,
    });
  });

  it("左ハンドルで x を動かしつつ width を縮める", () => {
    expect(
      applyFieldResize({
        field,
        direction: "w",
        dx: 2,
        dy: 0,
      }),
    ).toEqual({
      x: 12,
      width: 38,
    });
  });
});
