import { describe, expect, it } from "vitest";
import { formatPrefectureJumpLabel } from "@/features/ammo-ledger/catalog/format-prefecture-jump-label/format-prefecture-jump-label";

describe("formatPrefectureJumpLabel", () => {
  it("北海道は省略しない", () => {
    expect(formatPrefectureJumpLabel({ prefecture: "北海道" })).toBe("北海道");
  });

  it("県付きの都道府県は末尾を除く", () => {
    expect(formatPrefectureJumpLabel({ prefecture: "青森県" })).toBe("青森");
    expect(formatPrefectureJumpLabel({ prefecture: "京都府" })).toBe("京都");
    expect(formatPrefectureJumpLabel({ prefecture: "東京都" })).toBe("東京");
  });
});
