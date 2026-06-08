import { describe, expect, it } from "vitest";
import { formatIsoDateForDisplay } from "./format-iso-date-for-display";

describe("formatIsoDateForDisplay", () => {
  it("YYYY-MM-DD を YYYY/MM/DD に変換する", () => {
    expect(formatIsoDateForDisplay({ value: "2026-06-07" })).toBe("2026/06/07");
  });

  it("ゼロ埋めを維持する", () => {
    expect(formatIsoDateForDisplay({ value: "2026-01-02" })).toBe("2026/01/02");
  });

  it("想定外の形式はそのまま返す", () => {
    expect(formatIsoDateForDisplay({ value: "invalid" })).toBe("invalid");
  });
});
