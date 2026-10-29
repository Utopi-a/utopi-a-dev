import {
  addCompanionNote,
  readCompanionMemory,
  removeCompanionNotes,
} from "@/features/utopia-companion/companion-memory";

const RECALL_WORDS = /覚え|おぼえ|知って|前に|この前|名前|好き|約束|言ったっけ|話したっけ/;
const MAX_RECALLED = 10;

import { defineTool } from "@/features/utopia-companion/companion-tool";

export const MEMORY_TOOLS = [
  defineTool({
    name: "remember",
    description:
      "次に話すときにも覚えておきたいこと（相手の名前・好み・約束など）を、相手の言葉どおりの短い文で記憶に残す。",
    parameters: { note: "覚えておくこと" },
    describe: () => "覚えてる…",
    run: async ({ note }, { storage }) => {
      addCompanionNote({ storage, note });
      // 保存の失敗（容量超過など）は記憶の側で握りつぶすので、読み直して残ったか確かめる
      if (!readCompanionMemory({ storage }).notes.includes(note.trim().slice(0, 200))) {
        throw new Error("記憶に残せなかった");
      }
      return `覚えた: ${note}`;
    },
  }),
  defineTool({
    name: "recall_memory",
    description:
      "覚えたことの中から、言葉を含むものを探して返す。システムに書かれていない古い記憶を思い出すときに使う。",
    parameters: { query: "探す言葉（空白区切りで複数）" },
    describe: () => "思い出してる…",
    run: async ({ query }, { storage }) => {
      const words = query.split(/[\s、,]+/).filter(Boolean);
      const notes = readCompanionMemory({ storage }).notes;
      const found = notes.filter((note) => words.some((word) => note.includes(word)));
      if (found.length === 0) {
        return `「${query}」のことは覚えていない。覚えているのは全部で ${notes.length} 件。`;
      }
      return found.slice(-MAX_RECALLED).join("\n");
    },
    isRelevant: (userText) => RECALL_WORDS.test(userText),
  }),
  defineTool({
    name: "forget_memory",
    description:
      "覚えたことのうち、言葉を含むものを忘れる。相手に「忘れて」と頼まれたときだけ使う。",
    parameters: { containing: "忘れる記憶に含まれる言葉" },
    describe: () => "忘れてる…",
    run: async ({ containing }, { storage }) => {
      const count = removeCompanionNotes({ storage, containing });
      if (count === 0) {
        throw new Error(`「${containing}」を含む記憶はない`);
      }
      return `${count} 件忘れた。`;
    },
    isRelevant: (userText) => /忘れ|わすれ/.test(userText),
  }),
];
