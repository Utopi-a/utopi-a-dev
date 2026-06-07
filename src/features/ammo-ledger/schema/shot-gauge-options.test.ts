import { describe, expect, it } from "vitest";
import {
  formatGaugeNumberForDisplay,
  isShotGaugeAllowed,
  listShotGaugeSelectOptions,
  normalizeGaugeNumberForSelect,
  shotGaugeCombinedNine,
  shotGaugeOptionsGeneral,
  shotGaugeOptionsShooting,
} from "./shot-gauge-options";

describe("listShotGaugeSelectOptions", () => {
  it("射撃用は7.5号と9・9.5号のみ", () => {
    const options = listShotGaugeSelectOptions({ defaultPurpose: "shooting" });
    expect(options.map((o) => o.value)).toEqual([...shotGaugeOptionsShooting]);
  });

  it("その他の用途は10号を除き9・9.5号は統合", () => {
    const options = listShotGaugeSelectOptions({ defaultPurpose: "hunting" });
    expect(options.map((o) => o.value)).toEqual([...shotGaugeOptionsGeneral]);
    expect(options.map((o) => o.value)).not.toContain("10");
    expect(options.map((o) => o.value)).toContain(shotGaugeCombinedNine);
  });

  it("用途未選択も標準号数", () => {
    const options = listShotGaugeSelectOptions({ defaultPurpose: null });
    expect(options.map((o) => o.value)).toEqual([...shotGaugeOptionsGeneral]);
  });
});

describe("isShotGaugeAllowed", () => {
  it("射撃用で9・9.5は許可、00Bは不可", () => {
    expect(
      isShotGaugeAllowed({ gaugeNumber: shotGaugeCombinedNine, defaultPurpose: "shooting" }),
    ).toBe(true);
    expect(isShotGaugeAllowed({ gaugeNumber: "00B", defaultPurpose: "shooting" })).toBe(false);
  });
});

describe("formatGaugeNumberForDisplay", () => {
  it("9号と9.5号は9・9.5号にまとめる", () => {
    expect(formatGaugeNumberForDisplay({ gaugeNumber: "9" })).toBe(shotGaugeCombinedNine);
    expect(formatGaugeNumberForDisplay({ gaugeNumber: "9.5" })).toBe(shotGaugeCombinedNine);
  });
});

describe("normalizeGaugeNumberForSelect", () => {
  it("フォーム選択値に正規化する", () => {
    expect(normalizeGaugeNumberForSelect({ gaugeNumber: "9" })).toBe(shotGaugeCombinedNine);
    expect(normalizeGaugeNumberForSelect({ gaugeNumber: null })).toBe("");
  });
});
