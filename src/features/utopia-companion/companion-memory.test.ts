import { describe, expect, it } from "vitest";
import {
  addCompanionNote,
  appendCompanionHistory,
  clearCompanionMemory,
  readCompanionMemory,
  removeCompanionNotes,
  replaceCompanionHistory,
} from "@/features/utopia-companion/companion-memory";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";

const EMPTY = { notes: [], history: [], summary: "" };

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

  it("言葉を含む覚えたことを忘れ、忘れた数を返す", () => {
    const storage = createMemoryStorage();
    addCompanionNote({ storage, note: "相手はラーメンが好き" });
    addCompanionNote({ storage, note: "相手の名前はりょう" });
    expect(removeCompanionNotes({ storage, containing: "ラーメン" })).toBe(1);
    expect(readCompanionMemory({ storage }).notes).toEqual(["相手の名前はりょう"]);
  });

  it("会話は要約が追いつかなくても直近 32 件までは残し、要約に置き換えられる", () => {
    const storage = createMemoryStorage();
    for (let index = 0; index < 20; index += 1) {
      appendCompanionHistory({
        storage,
        entries: [
          { role: "user", content: `質問 ${index}` },
          { role: "assistant", content: `答え ${index}` },
        ],
      });
    }
    const { history } = readCompanionMemory({ storage });
    expect(history).toHaveLength(32);
    expect(history[0]).toEqual({ role: "user", content: "質問 4" });

    replaceCompanionHistory({
      storage,
      summary: "質問をたくさんされた",
      history: history.slice(-2),
    });
    expect(readCompanionMemory({ storage })).toEqual({
      notes: [],
      summary: "質問をたくさんされた",
      history: [
        { role: "user", content: "質問 19" },
        { role: "assistant", content: "答え 19" },
      ],
    });
  });

  it("壊れた保存内容は覚えていない扱いにし、消すと空になる", () => {
    const storage = createMemoryStorage();
    storage.setItem("utopia-companion.memory.v1", "{壊れた");
    expect(readCompanionMemory({ storage })).toEqual(EMPTY);

    addCompanionNote({ storage, note: "ラベンダーが好き" });
    clearCompanionMemory({ storage });
    expect(readCompanionMemory({ storage })).toEqual(EMPTY);
  });
});
