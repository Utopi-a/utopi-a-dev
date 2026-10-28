import type { InferenceToolCall } from "@/features/local-llm/inference-worker/inference-worker-messages";

/** 返答の頭に付けさせる気持ち。Live2D モデルの表情（utopia-expressions の id）と同じ名前にする */
export const COMPANION_EXPRESSIONS = [
  "neutral",
  "smile",
  "grin",
  "surprised",
  "shy",
  "pout",
] as const;

export type CompanionExpression = (typeof COMPANION_EXPRESSIONS)[number];

const TOOL_CALL_PATTERN =
  /<tool_call>\s*<function=([^\n>]+)>([\s\S]*?)<\/function>\s*<\/tool_call>/g;
const PARAMETER_PATTERN = /<parameter=([^>\n]+)>\n?([\s\S]*?)\n?<\/parameter>/g;
const EXPRESSION_TAG_PATTERN = /^\s*\[([a-z]+)\]\s*/i;
/** 読み上げる返事の文の数の上限。小さいモデルは「1〜3 文で」と頼んでも長く話し続けることがある */
const MAX_SENTENCES = 3;

/**
 * LFM3 の出力からツールの呼び出し（`<tool_call><function=…><parameter=…>`）を取り出す。
 * 呼び出しの外に書かれた文章は text として返す。
 */
export function parseToolCalls({ output, idPrefix }: { output: string; idPrefix: string }) {
  const toolCalls: InferenceToolCall[] = [];
  for (const [, name, body] of output.matchAll(TOOL_CALL_PATTERN)) {
    const args: Record<string, string> = {};
    for (const [, key, value] of body.matchAll(PARAMETER_PATTERN)) {
      args[key.trim()] = value.trim();
    }
    toolCalls.push({ id: `${idPrefix}-${toolCalls.length}`, name: name.trim(), arguments: args });
  }
  return { toolCalls, text: output.replace(TOOL_CALL_PATTERN, "").trim() };
}

/**
 * 返答の頭の気持ちのタグ（`[smile]` など）を表情に変え、読み上げる文から外す。
 * タグがない・知らない名前のときは neutral にする。思考の書き出し（`<think>`）は読まず、文は 3 つまでにする。
 */
export function parseCompanionReply({ text: rawText }: { text: string }) {
  // 思考を切っていても、道具の結果のあとに考えを書いて `</think>` で閉じることがある
  const text = rawText
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<\/?think>/g, "")
    .trim();
  const match = text.match(EXPRESSION_TAG_PATTERN);
  const name = match?.[1].toLowerCase();
  const expression = COMPANION_EXPRESSIONS.find((item) => item === name) ?? "neutral";
  // 文中に紛れたタグも読み上げない
  const speech = text
    .replace(EXPRESSION_TAG_PATTERN, "")
    .replace(/\[[a-z]+\]/gi, "")
    .trim();
  const sentences = speech.match(/[^。！？!?]+[。！？!?]*/gu) ?? [];
  return { expression, speech: sentences.slice(0, MAX_SENTENCES).join("").trim() };
}
