import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveScrollBehavior } from "@/lib/resolve-scroll-behavior";

function stubReducedMotion({ reduce }: { reduce: boolean }) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query === "(prefers-reduced-motion: reduce)",
    })),
  );
}

describe("resolveScrollBehavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("動きを減らす設定では瞬時にスクロールする", () => {
    stubReducedMotion({ reduce: true });

    expect(resolveScrollBehavior()).toBe("auto");
  });

  it("設定がなければなめらかにスクロールする", () => {
    stubReducedMotion({ reduce: false });

    expect(resolveScrollBehavior()).toBe("smooth");
  });
});
