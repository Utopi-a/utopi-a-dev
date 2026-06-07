import { describe, expect, it } from "vitest";
import {
  isShotGaugeAllowed,
  listShotGaugeSelectOptions,
  normalizeGaugeNumberForSelect,
  shotGaugeOptionsGeneral,
  shotGaugeOptionsShooting,
} from "./shot-gauge-options";

describe("listShotGaugeSelectOptions", () => {
  it("射撃用は7.5号・9号・9.5号のみ", () => {
    const options = listShotGaugeSelectOptions({ defaultPurpose: "shooting" });
    expect(options.map((o) => o.value)).toEqual([...shotGaugeOptionsShooting]);
  });

  it("その他の用途は10号を除く標準号数", () => {
    const options = listShotGaugeSelectOptions({ defaultPurpose: "hunting" });
    expect(options.map((o) => o.value)).toEqual([...shotGaugeOptionsGeneral]);
    expect(options.map((o) => o.value)).not.toContain("10");
    expect(options.map((o) => o.value)).toContain("9");
    expect(options.map((o) => o.value)).toContain("9.5");
  });

  it("用途未選択も標準号数", () => {
    const options = listShotGaugeSelectOptions({ defaultPurpose: null });
    expect(options.map((o) => o.value)).toEqual([...shotGaugeOptionsGeneral]);
  });
});

describe("isShotGaugeAllowed", () => {
  it("射撃用で9号は許可、00Bは不可", () => {
    expect(isShotGaugeAllowed({ gaugeNumber: "9", defaultPurpose: "shooting" })).toBe(true);
    expect(isShotGaugeAllowed({ gaugeNumber: "00B", defaultPurpose: "shooting" })).toBe(false);
  });
});

describe("normalizeGaugeNumberForSelect", () => {
  it("そのまま選択値に使う", () => {
    expect(normalizeGaugeNumberForSelect({ gaugeNumber: "9.5" })).toBe("9.5");
    expect(normalizeGaugeNumberForSelect({ gaugeNumber: null })).toBe("");
  });
});
