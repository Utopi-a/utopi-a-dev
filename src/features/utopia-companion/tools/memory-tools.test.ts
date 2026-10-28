import { describe, expect, it, vi } from "vitest";
import {
  addCompanionNote,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import { MEMORY_TOOLS } from "@/features/utopia-companion/tools/memory-tools";

function contextWith({ storage }: { storage: ReturnType<typeof createMemoryStorage> }) {
  return { fetch: vi.fn<typeof globalThis.fetch>(), storage, now: new Date() };
}

describe("memory tools", () => {
  it("remember は記憶に残し、残せなかったときは失敗として返す", async () => {
    const storage = createMemoryStorage();
    expect(
      await runCompanionTool({
        call: { id: "c", name: "remember", arguments: { note: "相手はラーメンが好き" } },
        tools: MEMORY_TOOLS,
        context: contextWith({ storage }),
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
        context: contextWith({ storage: fullStorage }),
      }),
    ).toBe("失敗: remember（記憶に残せなかった）。");
  });

  it("recall_memory は言葉を含む記憶を探し、なければ覚えている件数を返す", async () => {
    const storage = createMemoryStorage();
    addCompanionNote({ storage, note: "相手はラーメンが好き" });
    addCompanionNote({ storage, note: "相手の名前はりょう" });
    expect(
      await runCompanionTool({
        call: { id: "c", name: "recall_memory", arguments: { query: "名前 誕生日" } },
        tools: MEMORY_TOOLS,
        context: contextWith({ storage }),
      }),
    ).toBe("成功: 相手の名前はりょう");
    expect(
      await runCompanionTool({
        call: { id: "c", name: "recall_memory", arguments: { query: "猫" } },
        tools: MEMORY_TOOLS,
        context: contextWith({ storage }),
      }),
    ).toBe("成功: 「猫」のことは覚えていない。覚えているのは全部で 2 件。");
  });

  it("forget_memory は言葉を含む記憶を忘れ、なければ失敗として返す", async () => {
    const storage = createMemoryStorage();
    addCompanionNote({ storage, note: "相手はラーメンが好き" });
    expect(
      await runCompanionTool({
        call: { id: "c", name: "forget_memory", arguments: { containing: "ラーメン" } },
        tools: MEMORY_TOOLS,
        context: contextWith({ storage }),
      }),
    ).toBe("成功: 1 件忘れた。");
    expect(
      await runCompanionTool({
        call: { id: "c", name: "forget_memory", arguments: { containing: "ラーメン" } },
        tools: MEMORY_TOOLS,
        context: contextWith({ storage }),
      }),
    ).toBe("失敗: forget_memory（「ラーメン」を含む記憶はない）。");
  });
});
