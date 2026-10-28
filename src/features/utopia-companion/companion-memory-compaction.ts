import type { CompanionGenerate } from "@/features/utopia-companion/companion-agent";
import {
  MAX_HISTORY,
  readCompanionMemory,
  replaceCompanionHistory,
} from "@/features/utopia-companion/companion-memory";
import { splitThinking } from "@/features/utopia-companion/companion-thinking";

const MAX_SUMMARY_LENGTH = 400;

/**
 * 直近の会話が上限を超えたら、古い半分をこれまでの要約に混ぜて短くまとめ直す。
 * 捨てずに要約にするので、何十往復も前に話したことも、ある程度は覚えていられる。要約したら true を返す
 */
export async function compactCompanionMemory({
  storage,
  generate,
}: {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  generate: CompanionGenerate;
}) {
  const memory = readCompanionMemory({ storage });
  if (memory.history.length <= MAX_HISTORY) {
    return false;
  }
  const keepFrom = memory.history.length - MAX_HISTORY / 2;
  const transcript = memory.history
    .slice(0, keepFrom)
    .map(({ role, content }) => `${role === "user" ? "相手" : "ボク"}: ${content}`)
    .join("\n");
  const output = await generate({
    messages: [
      {
        role: "system",
        content:
          "あなたは「ゆーとぴあちゃん」の記憶を整理する係。会話から、相手のこと・話した話題・約束を落とさずに短くまとめる。",
      },
      {
        role: "user",
        content: [
          `これまでの要約: ${memory.summary || "なし"}`,
          "",
          "続きの会話:",
          transcript,
          "",
          "これまでの要約と続きの会話を合わせて、ボクの目線で 200 字以内の日本語にまとめる。要約の文だけを書く。",
        ].join("\n"),
      },
    ],
    tools: [],
    thinking: false,
  });
  const summary = splitThinking({ output }).visible.slice(0, MAX_SUMMARY_LENGTH).trim();
  if (summary.length === 0) {
    return false;
  }
  replaceCompanionHistory({ storage, summary, history: memory.history.slice(keepFrom) });
  return true;
}
