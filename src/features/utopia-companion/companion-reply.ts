import type {
  InferenceTool,
  InferenceToolCall,
} from "@/features/local-llm/inference-worker/inference-worker-messages";

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

const LOOSE_CALL_PATTERN = /\[([a-z][a-z_]*)\]\s*(\{[^{}]*\}|[^\n[]*)/g;
const QUOTES_PATTERN = /^[「『"']+|[」』"']+$/g;

/**
 * 書式どおりでない呼び出し（`[search_web] 日光東照宮` や `[search_web]\n{"query": "…"}`）を、
 * 知っている道具の名前なら呼び出しとして拾う。映像を見ながら話す LFM3-VL や思考なしの LFM3-1.7B は、
 * `<tool_call>` の代わりにこう書くことがあり、促しても書式どおりに書き直さないことがあった。
 * 引数は JSON か、引数が 1 つの道具なら名前のあとの 1 行を使う
 */
export function parseLooseToolCall({
  text,
  tools,
  id,
}: {
  text: string;
  tools: readonly InferenceTool[];
  id: string;
}): InferenceToolCall | null {
  for (const [, name, rest] of text.matchAll(LOOSE_CALL_PATTERN)) {
    const tool = tools.find((item) => item.function.name === name);
    if (!tool) {
      continue;
    }
    const keys = Object.keys(tool.function.parameters.properties);
    const args = rest.startsWith("{")
      ? parseJsonArguments({ json: rest })
      : keys.length === 1
        ? { [keys[0]]: rest.trim().replace(QUOTES_PATTERN, "").trim() }
        : null;
    if (args && Object.values(args).some((value) => value.length > 0)) {
      return { id, name, arguments: args };
    }
  }
  return null;
}

function parseJsonArguments({ json }: { json: string }) {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value).trim()]),
    );
  } catch {
    return null;
  }
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
  // 絵文字は Irodori-TTS では話し方の指定になるので、読み上げる文に残さない
  // 声で読むので Markdown の飾り（強調・コード・見出し・箇条書きの記号）は外し、箇条書きは文として区切る
  const speech = text
    .replace(EXPRESSION_TAG_PATTERN, "")
    .replace(/\[[a-z]+\]/gi, "")
    .replace(/\*\*|__|`|^#+\s*/gm, "")
    .replace(/(?<=^|[\s。！？!?])[-・]\s+/gm, "\n")
    .replace(/(?:\p{Extended_Pictographic}\uFE0F?)+/gu, "\n")
    .trim();
  // 同じ文を言い直すことがあるので、2 回目からは読まない
  const sentences = [
    ...new Set((speech.match(/[^。！？!?\n]+[。！？!?]*/gu) ?? []).map((item) => item.trim())),
  ];
  return {
    expression,
    speech: sentences
      .filter((sentence) => sentence.length > 0)
      .slice(0, MAX_SENTENCES)
      .join(""),
  };
}
