import { describe, expect, it } from "vitest";
import {
  addCompanionNote,
  appendCompanionHistory,
  clearCompanionMemory,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";

describe("companion memory", () => {
  it("覚えたことは重ねずに残し、上限を超えたら古いものから忘れる", () => {
    const storage = createMemoryStorage();
    addCompanionNote({ storage, note: "相手の名前はりょう" });
    addCompanionNote({ storage, note: "相手の名前はりょう" });
    expect(readCompanionMemory({ storage }).notes).toEqual(["相手の名前はりょう"]);

    for (let index = 0; index < 45; index += 1) {
      addCompanionNote({ storage, note: `メモ ${index}` });
    }
    const { notes } = readCompanionMemory({ storage });
    expect(notes).toHaveLength(40);
    expect(notes.at(-1)).toBe("メモ 44");
    expect(notes).not.toContain("相手の名前はりょう");
  });

  it("会話は直近 16 件だけを残す", () => {
    const storage = createMemoryStorage();
    for (let index = 0; index < 10; index += 1) {
      appendCompanionHistory({
        storage,
        entries: [
          { role: "user", content: `質問 ${index}` },
          { role: "assistant", content: `答え ${index}` },
        ],
      });
    }
    const { history } = readCompanionMemory({ storage });
    expect(history).toHaveLength(16);
    expect(history[0]).toEqual({ role: "user", content: "質問 2" });
  });

  it("壊れた保存内容は覚えていない扱いにし、消すと空になる", () => {
    const storage = createMemoryStorage();
    storage.setItem("utopia-companion.memory.v1", "{壊れた");
    expect(readCompanionMemory({ storage })).toEqual({ notes: [], history: [] });

    addCompanionNote({ storage, note: "ラベンダーが好き" });
    clearCompanionMemory({ storage });
    expect(readCompanionMemory({ storage })).toEqual({ notes: [], history: [] });
  });
});
