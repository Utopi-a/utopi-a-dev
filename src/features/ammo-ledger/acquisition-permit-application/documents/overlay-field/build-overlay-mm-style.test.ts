import { describe, expect, it } from "vitest";
import { buildOverlayMmStyle } from "./build-overlay-mm-style";

describe("buildOverlayMmStyle", () => {
  it("mm 座標をページサイズに対する % に変換する", () => {
    expect(
      buildOverlayMmStyle({
        x: 21,
        y: 29.7,
        width: 42,
        fontSize: 3.2,
        pageWidthMm: 210,
        pageHeightMm: 297,
      }),
    ).toEqual({
      left: "10%",
      top: "10%",
      width: "20%",
      fontSize: "3.2mm",
      textAlign: "left",
    });
  });
});
