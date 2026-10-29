import { describe, expect, it, vi } from "vitest";
import type { CompanionGenerate } from "@/features/utopia-companion/companion-agent";
import {
  appendCompanionHistory,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import {
  compactCompanionMemory,
  toPlainSummary,
} from "@/features/utopia-companion/companion-memory-compaction";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";

function talk({
  storage,
  turns,
}: {
  storage: ReturnType<typeof createMemoryStorage>;
  turns: number;
}) {
  for (let index = 0; index < turns; index += 1) {
    appendCompanionHistory({
      storage,
      entries: [
        { role: "user", content: `質問 ${index}` },
        { role: "assistant", content: `[smile] 答え ${index}` },
      ],
    });
  }
}

describe("compactCompanionMemory", () => {
  it("直近の会話が上限以内なら何もしない", async () => {
    const storage = createMemoryStorage();
    talk({ storage, turns: 8 });
    const generate = vi.fn<CompanionGenerate>();
    expect(await compactCompanionMemory({ storage, generate })).toBe(false);
    expect(generate).not.toHaveBeenCalled();
  });

  it("上限を超えたら、古いぶんをこれまでの要約と合わせて要約にし、新しい 8 件を残す", async () => {
    const storage = createMemoryStorage();
    talk({ storage, turns: 9 });
    const generate = vi.fn<CompanionGenerate>().mockResolvedValue("りょうと質問ごっこをした。");

    expect(await compactCompanionMemory({ storage, generate })).toBe(true);

    const memory = readCompanionMemory({ storage });
    expect(memory.summary).toBe("りょうと質問ごっこをした。");
    expect(memory.history).toHaveLength(8);
    expect(memory.history[0]).toEqual({ role: "user", content: "質問 5" });
    // 気持ちのタグは要約に要らないので外して渡す
    const prompt = generate.mock.calls[0][0].messages.at(-1)?.content ?? "";
    expect(prompt).toContain("相手: 質問 0\nボク: 答え 0");
    expect(prompt).not.toContain("質問 5");
    expect(generate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ tools: [], thinking: false }),
    );
  });

  it("見出しや箇条書きで書かれた要約は、飾りを外して普通の文にして残す", async () => {
    const storage = createMemoryStorage();
    talk({ storage, turns: 9 });
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValue(
        "**要約（200字以内）**\n\n- **相手**：りょう。味噌ラーメンが好き\n- **話題**：質問ごっこをした。\n\n**続き**：まだ答えていない質問がある",
      );

    await compactCompanionMemory({ storage, generate });

    expect(readCompanionMemory({ storage }).summary).toBe(
      "相手：りょう。味噌ラーメンが好き。話題：質問ごっこをした。続き：まだ答えていない質問がある。",
    );
  });

  it("要約が空なら会話を消さない", async () => {
    const storage = createMemoryStorage();
    talk({ storage, turns: 9 });
    const generate = vi.fn<CompanionGenerate>().mockResolvedValue("");
    expect(await compactCompanionMemory({ storage, generate })).toBe(false);
    expect(readCompanionMemory({ storage }).history).toHaveLength(18);
  });
});

describe("toPlainSummary", () => {
  it("長すぎる要約は、上限までに収まる最後の文で切る", () => {
    const sentence = "相手はラーメンが好き。";
    const summary = toPlainSummary({ text: sentence.repeat(50) });
    expect(summary.length).toBeLessThanOrEqual(400);
    expect(summary.endsWith("。")).toBe(true);
  });
});
