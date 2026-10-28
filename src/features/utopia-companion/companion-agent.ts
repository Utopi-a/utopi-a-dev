import type {
  InferenceImageAttachment,
  InferenceMessage,
  InferenceTool,
  InferenceToolCall,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import {
  appendCompanionHistory,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import { buildCompanionSystemPrompt } from "@/features/utopia-companion/companion-persona";
import { parseCompanionReply, parseToolCalls } from "@/features/utopia-companion/companion-reply";
import { splitThinking } from "@/features/utopia-companion/companion-thinking";
import {
  type CompanionTool,
  type CompanionToolContext,
  runCompanionTool,
  selectCompanionTools,
} from "@/features/utopia-companion/companion-tool";
import { COMPANION_TOOLS } from "@/features/utopia-companion/companion-toolbox";

/** モデルに履歴とツールを渡して、生成した文章を丸ごと返す。thinking なら思考を書かせる */
export type CompanionGenerate = (options: {
  messages: InferenceMessage[];
  tools: InferenceTool[];
  thinking: boolean;
}) => Promise<string>;

/** 返事を作る途中の出来事。画面に「考え中」「調べてる」などを出す */
export type CompanionStep =
  | { type: "thinking" }
  | { type: "tool"; call: InferenceToolCall; description: string }
  | { type: "answering" };

/**
 * 1 回の返事で、道具を使って考え直せる回数と、道具を呼べる回数の上限。
 * 2B 級のモデルは長く続けるほど話がそれるので、短い探索で切り上げて分かったことを話させる
 */
const MAX_STEPS = 4;
const MAX_TOOL_CALLS = 6;

/**
 * 道具を使い切ったあとに答えさせる指示。道具を外しただけだと、小さいモデルは呼び出しを書き続けて
 * 返事が空になる（ブラウザで確かめた）ので、ここまでの結果で話すようはっきり伝える
 */
const ANSWER_NOW =
  "（道具はもう使えない。ここまでに分かったことをもとに、気持ちのタグを付けて相手に返事をする。分からなかったことは正直に言う）";

function callKey({ call }: { call: InferenceToolCall }) {
  return JSON.stringify([call.name, Object.entries(call.arguments).sort()]);
}

function throwIfAborted({ signal }: { signal?: AbortSignal }) {
  if (signal?.aborted) {
    throw new DOMException("返事を取りやめた", "AbortError");
  }
}

/**
 * ゆーとぴあちゃんの 1 回の返事。考えて（思考モード）、必要なら道具を使い、結果を見て次の手を決める。
 * 呼び出しは名前と引数を確かめてから実行し、誤りは失敗として返して直させる。
 * 上限に達したら分かったことで答えさせ、気持ち（表情）と読み上げる文に分けて返す。会話は記憶に残す。
 */
export async function runCompanionTurn({
  userText,
  images,
  historyText = userText,
  generate,
  tools = COMPANION_TOOLS,
  context,
  onStep,
}: {
  userText: string;
  images?: InferenceImageAttachment[];
  /** 記憶に残す相手の発言。カメラの様子を見せたときなど、プロンプトとは別の書き方で残す */
  historyText?: string;
  generate: CompanionGenerate;
  tools?: readonly CompanionTool[];
  context: CompanionToolContext;
  onStep?: (step: CompanionStep) => void;
}) {
  const memory = readCompanionMemory({ storage: context.storage });
  const available = selectCompanionTools({ tools, userText });
  const messages: InferenceMessage[] = [
    {
      role: "system",
      content: buildCompanionSystemPrompt({ memories: memory.notes, now: context.now }),
    },
    ...memory.history,
    { role: "user", content: userText, images },
  ];

  // 同じ道具を同じ引数で呼び直すのは空回りなので、結果を使い回して答えさせる
  const results = new Map<string, string>();
  let toolCallCount = 0;
  let answer = "";
  for (let step = 0; step < MAX_STEPS; step += 1) {
    throwIfAborted({ signal: context.signal });
    onStep?.({ type: "thinking" });
    // 渡したあとで messages に足していくので、その時点の写しを渡す
    const output = await generate({
      messages: [...messages],
      tools: available.map((tool) => tool.definition),
      thinking: true,
    });
    const { visible, isComplete } = splitThinking({ output });
    if (!isComplete) {
      break;
    }
    const { toolCalls, text } = parseToolCalls({ output: visible, idPrefix: `call-${step}` });
    if (toolCalls.length === 0) {
      answer = text;
      break;
    }
    if (toolCalls.every((call) => results.has(callKey({ call })))) {
      break;
    }
    messages.push({ role: "assistant", content: text, toolCalls });
    for (const call of toolCalls) {
      const key = callKey({ call });
      let result = results.get(key);
      if (result === undefined) {
        if (toolCallCount >= MAX_TOOL_CALLS) {
          result = "失敗: この返事で使える道具の回数を超えた。";
        } else {
          toolCallCount += 1;
          const tool = available.find((item) => item.definition.function.name === call.name);
          onStep?.({
            type: "tool",
            call,
            description: tool?.describe(call.arguments) ?? "考え中…",
          });
          result = await runCompanionTool({ call, tools: available, context });
        }
        results.set(key, result);
      }
      messages.push({ role: "tool", toolCallId: call.id, content: result });
    }
  }

  if (answer.length === 0) {
    throwIfAborted({ signal: context.signal });
    onStep?.({ type: "answering" });
    if (messages.at(-1)?.role === "tool") {
      messages.push({ role: "user", content: ANSWER_NOW });
    }
    const output = await generate({ messages: [...messages], tools: [], thinking: false });
    answer = parseToolCalls({ output: splitThinking({ output }).visible, idPrefix: "final" }).text;
  }

  const { expression, speech } = parseCompanionReply({ text: answer });
  const reply = speech || "…";
  appendCompanionHistory({
    storage: context.storage,
    entries: [
      { role: "user", content: historyText },
      // 次の返事でも気持ちのタグを付けるよう、タグごと残す
      { role: "assistant", content: `[${expression}] ${reply}` },
    ],
  });
  return { expression, speech: reply };
}
