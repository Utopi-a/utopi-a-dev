import { describe, expect, it, vi } from "vitest";
import { readCompanionMemory } from "@/features/utopia-companion/companion-memory";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import { MEMORY_TOOLS } from "@/features/utopia-companion/tools/memory-tools";

describe("remember", () => {
  it("記憶に残し、残せなかったときは失敗として返す", async () => {
    const storage = createMemoryStorage();
    const context = { fetch: vi.fn<typeof globalThis.fetch>(), storage, now: new Date() };
    expect(
      await runCompanionTool({
        call: { id: "c", name: "remember", arguments: { note: "相手はラーメンが好き" } },
        tools: MEMORY_TOOLS,
        context,
      }),
    ).toBe("成功: 覚えた: 相手はラーメンが好き");
    expect(readCompanionMemory({ storage }).notes).toEqual(["相手はラーメンが好き"]);

    const fullStorage = {
      ...createMemoryStorage(),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(
      await runCompanionTool({
        call: { id: "c", name: "remember", arguments: { note: "覚えたいこと" } },
        tools: MEMORY_TOOLS,
        context: { ...context, storage: fullStorage },
      }),
    ).toBe("失敗: remember（記憶に残せなかった）。");
  });
});
