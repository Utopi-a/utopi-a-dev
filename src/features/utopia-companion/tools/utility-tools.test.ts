import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import {
  calculateExpression,
  UTILITY_TOOLS,
} from "@/features/utopia-companion/tools/utility-tools";

describe("calculateExpression", () => {
  it("四則演算・累乗・剰余・括弧を、優先順位どおりに計算する", () => {
    expect(calculateExpression({ expression: "(1200 + 800) * 1.1" })).toBe(2200);
    expect(calculateExpression({ expression: "2^3^2" })).toBe(512);
    expect(calculateExpression({ expression: "１０ ÷ ４ − 1" })).toBe(1.5);
    expect(calculateExpression({ expression: "-3 * -(2 + 1)" })).toBe(9);
    expect(calculateExpression({ expression: "17 % 5" })).toBe(2);
    expect(calculateExpression({ expression: "0.1 + 0.2" })).toBe(0.3);
  });

  it("数式でないものは実行せずに読めないとする", () => {
    expect(() => calculateExpression({ expression: "alert(1)" })).toThrow("1 文字目が読めない");
    expect(() => calculateExpression({ expression: "1 + (2" })).toThrow("括弧が閉じていない");
    expect(() => calculateExpression({ expression: "1 / 0" })).toThrow("答えが数にならない");
  });
});

describe("utility tools", () => {
  it("いまの日時を、会話の時点の時刻で返す", async () => {
    const result = await runCompanionTool({
      call: { id: "c", name: "get_current_time", arguments: {} },
      tools: UTILITY_TOOLS,
      context: {
        fetch: vi.fn<typeof globalThis.fetch>(),
        storage: createMemoryStorage(),
        now: new Date("2026-10-29T15:30:00+09:00"),
      },
    });
    expect(result).toBe("成功: 2026年10月29日木曜日 15:30");
  });

  it("時間や計算の話のときだけ渡す", () => {
    const [time, calculate] = UTILITY_TOOLS;
    expect(time.isRelevant?.("今日って何曜日？")).toBe(true);
    expect(time.isRelevant?.("やっほー")).toBe(false);
    expect(calculate.isRelevant?.("1980円を3人で割ると？")).toBe(true);
    expect(calculate.isRelevant?.("ラーメン好き")).toBe(false);
  });
});
