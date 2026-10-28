import {
  addCompanionNote,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
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
];
