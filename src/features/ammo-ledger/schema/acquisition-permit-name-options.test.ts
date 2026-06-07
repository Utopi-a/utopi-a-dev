import { describe, expect, it } from "vitest";
import { acquisitionPermitNameOptions } from "./acquisition-permit-name-options";

describe("acquisitionPermitNameOptions", () => {
  it("国内で一般的な散弾番径を含む", () => {
    expect(acquisitionPermitNameOptions).toEqual(expect.arrayContaining(["12番", "20番", "410番"]));
  });

  it("府令上の火工品・火薬類区分を含む", () => {
    expect(acquisitionPermitNameOptions).toEqual(
      expect.arrayContaining(["実包（ライフル）", "空包", "銃用雷管", "無煙火薬", "黒色猟用火薬"]),
    );
  });

  it("国内で一般的でない口径やその他は含めない", () => {
    expect(acquisitionPermitNameOptions).not.toContain("11番");
    expect(acquisitionPermitNameOptions).not.toContain("10番");
    expect(acquisitionPermitNameOptions).not.toContain("その他");
  });
});
