import { describe, expect, it } from "vitest";
import { computeRounds } from "./compute-rounds";

describe("computeRounds", () => {
  it("箱数とバラ弾から発数を計算する", () => {
    expect(
      computeRounds({
        boxCount: 3,
        looseRounds: -2,
        roundsPerBox: 25,
      }),
    ).toBe(73);
  });

  it("箱数のみの場合", () => {
    expect(
      computeRounds({
        boxCount: 2,
        looseRounds: 0,
        roundsPerBox: 25,
      }),
    ).toBe(50);
  });

  it("バラ弾のみの場合", () => {
    expect(
      computeRounds({
        boxCount: 0,
        looseRounds: 15,
        roundsPerBox: 25,
      }),
    ).toBe(15);
  });
});
