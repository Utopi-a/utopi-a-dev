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
import {
  COMPANION_TOOLS,
  type CompanionTool,
  type CompanionToolContext,
  runCompanionTool,
} from "@/features/utopia-companion/companion-tools";

/** モデルに履歴とツールを渡して、生成した文章を丸ごと返す */
export type CompanionGenerate = (options: {
  messages: InferenceMessage[];
  tools: InferenceTool[];
}) => Promise<string>;

/** 道具を使うのは 1 回の返事につき 2 回まで。2B のモデルでは、それ以上続けると話がそれやすい */
const MAX_TOOL_ROUNDS = 2;

function callKey({ call }: { call: InferenceToolCall }) {
  return JSON.stringify([call.name, Object.entries(call.arguments).sort()]);
}

/**
 * ゆーとぴあちゃんの 1 回の返事。必要なら道具（検索・ページを読む・覚える）を使ってから答え、
 * 気持ち（表情）と読み上げる文に分けて返す。会話は記憶に残し、次の返事の文脈にする。
 */
export async function runCompanionTurn({
  userText,
  images,
  historyText = userText,
  generate,
  tools = COMPANION_TOOLS,
  context,
  now,
  onToolCall,
}: {
  userText: string;
  images?: InferenceImageAttachment[];
  /** 記憶に残す相手の発言。カメラの様子を見せたときなど、プロンプトとは別の書き方で残す */
  historyText?: string;
  generate: CompanionGenerate;
  tools?: readonly CompanionTool[];
  context: CompanionToolContext;
  now: Date;
  /** 道具を使い始めたとき。description は画面に出す一言 */
  onToolCall?: (event: { call: InferenceToolCall; description: string }) => void;
}) {
  const memory = readCompanionMemory({ storage: context.storage });
  const messages: InferenceMessage[] = [
    { role: "system", content: buildCompanionSystemPrompt({ memories: memory.notes, now }) },
    ...memory.history,
    { role: "user", content: userText, images },
  ];

  const definitions = tools.map((tool) => tool.definition);
  // 同じ道具を同じ引数で呼び直すのは空回りなので、結果を使い回して答えさせる
  const results = new Map<string, string>();
  let output = "";
  for (let round = 0; ; round += 1) {
    const canUseTools = round < MAX_TOOL_ROUNDS;
    output = await generate({ messages, tools: canUseTools ? definitions : [] });
    const { toolCalls, text } = parseToolCalls({ output, idPrefix: `call-${round}` });
    const isRepeating =
      toolCalls.length > 0 && toolCalls.every((call) => results.has(callKey({ call })));
    if (toolCalls.length === 0 || !canUseTools || isRepeating) {
      output = text;
      if (output.length > 0 || toolCalls.length === 0) {
        break;
      }
      // 道具の呼び出しだけで答えがないときは、道具なしでもう 1 度答えさせる
      output = parseToolCalls({
        output: await generate({ messages, tools: [] }),
        idPrefix: "final",
      }).text;
      break;
    }
    messages.push({ role: "assistant", content: text, toolCalls });
    for (const call of toolCalls) {
      const key = callKey({ call });
      const tool = tools.find((item) => item.definition.function.name === call.name);
      onToolCall?.({ call, description: tool?.describe(call.arguments) ?? "考え中…" });
      const result = results.get(key) ?? (await runCompanionTool({ call, tools, context }));
      results.set(key, result);
      messages.push({ role: "tool", toolCallId: call.id, content: result });
    }
  }

  const { expression, speech } = parseCompanionReply({ text: output });
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
