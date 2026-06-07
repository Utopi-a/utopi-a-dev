import { describe, expect, it } from "vitest";
import { inputKinds, mapInputKindToCategory } from "./input-kind";

describe("mapInputKindToCategory", () => {
  it.each([
    ["consume", "consume"],
    ["acquire", "acquire"],
    ["dispose", "dispose"],
    ["transfer", "transfer"],
  ] as const)("inputKind %s → category %s", (inputKind, category) => {
    expect(mapInputKindToCategory({ inputKind })).toBe(category);
  });

  it("stock_check は法定区分に変換しない", () => {
    expect(mapInputKindToCategory({ inputKind: "stock_check" })).toBeNull();
  });

  it("全 inputKind を網羅している", () => {
    for (const kind of inputKinds) {
      expect(() => mapInputKindToCategory({ inputKind: kind })).not.toThrow();
    }
  });
});
