import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import { createCameraTool } from "@/features/utopia-companion/tools/camera-tool";

describe("look_at_camera", () => {
  it("カメラを見て質問に答え、見られなかったときは失敗として返す", async () => {
    const context = {
      fetch: vi.fn<typeof globalThis.fetch>(),
      storage: createMemoryStorage(),
      now: new Date(),
    };
    const look = vi
      .fn()
      .mockResolvedValueOnce("赤いマグカップ。")
      .mockRejectedValueOnce(new Error("カメラに何も映っていない"));
    const tool = createCameraTool({ look });

    expect(
      await runCompanionTool({
        call: { id: "c", name: "look_at_camera", arguments: { question: "これ何？" } },
        tools: [tool],
        context,
      }),
    ).toBe("成功: 赤いマグカップ。");
    expect(look).toHaveBeenCalledWith("これ何？");
    expect(
      await runCompanionTool({
        call: { id: "c", name: "look_at_camera", arguments: { question: "これ何？" } },
        tools: [tool],
        context,
      }),
    ).toBe("失敗: look_at_camera（カメラに何も映っていない）。");
  });

  it("カメラの前のものの話のときだけ渡す", () => {
    const tool = createCameraTool({ look: vi.fn() });
    expect(tool.isRelevant?.("これ何かわかる？")).toBe(true);
    expect(tool.isRelevant?.("今日の天気は")).toBe(false);
  });
});
