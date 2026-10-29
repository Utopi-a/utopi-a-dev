import type { CompanionGenerate } from "@/features/utopia-companion/companion-agent";
import {
  MAX_HISTORY,
  readCompanionMemory,
  replaceCompanionHistory,
} from "@/features/utopia-companion/companion-memory";
import { splitThinking } from "@/features/utopia-companion/companion-thinking";

const MAX_SUMMARY_LENGTH = 400;
/** 返事の頭の気持ちのタグ。要約には要らない */
const EXPRESSION_TAG_PATTERN = /^\s*\[[a-z]+\]\s*/i;
/** 「**要約（200字以内）**」のように強調だけの行や、「# 要約」の行。見出しなので要約に入れない */
const HEADING_LINE_PATTERN = /^(?:(\*\*|__)[^*_]*\1[:：]?|#+\s.*)$/;
const SENTENCE_END_PATTERN = /[。！？!?]$/;

/**
 * 要約を普通の文にする。LFM3-1.7B は、見出しや「- **相手**：…」の箇条書きで要約を書くことがあり、
 * そのまま次の返事のプロンプトに入れると、返事まで崩れた。行の飾りを外して文としてつなぎ、文の切れ目で長さをそろえる
 */
export function toPlainSummary({ text }: { text: string }) {
  const joined = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !HEADING_LINE_PATTERN.test(line))
    .map((line) =>
      line
        .replace(/^(?:[-*・]|\d+[.)])\s+/, "")
        .replace(/\*\*|__|`/g, "")
        .trim(),
    )
    .filter((line) => line.length > 0)
    .map((line) => (SENTENCE_END_PATTERN.test(line) ? line : `${line}。`))
    .join("");
  if (joined.length <= MAX_SUMMARY_LENGTH) {
    return joined;
  }
  const head = joined.slice(0, MAX_SUMMARY_LENGTH);
  const end = Math.max(head.lastIndexOf("。"), head.lastIndexOf("！"), head.lastIndexOf("？"));
  return end > 0 ? head.slice(0, end + 1) : head;
}

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
    .map(
      ({ role, content }) =>
        `${role === "user" ? "相手" : "ボク"}: ${content.replace(EXPRESSION_TAG_PATTERN, "")}`,
    )
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
          "これまでの要約と続きの会話を合わせて、ボクの目線で 200 字以内の日本語の文章にまとめる。",
          "見出し・箇条書き・記号は使わず、2〜4 文の普通の文で書く。相手が言ったことは「相手は」、ボクが言ったことは「ボクは」で書き分け、会話にないことは足さない。要約の文だけを書く。",
        ].join("\n"),
      },
    ],
    tools: [],
    thinking: false,
  });
  const summary = toPlainSummary({ text: splitThinking({ output }).visible });
  if (summary.length === 0) {
    return false;
  }
  replaceCompanionHistory({ storage, summary, history: memory.history.slice(keepFrom) });
  return true;
}
