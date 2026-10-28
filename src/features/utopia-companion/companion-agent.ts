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
import { COMPANION_TOOLS, runCompanionTool } from "@/features/utopia-companion/companion-tools";

/** モデルに履歴とツールを渡して、生成した文章を丸ごと返す */
export type CompanionGenerate = (options: {
  messages: InferenceMessage[];
  tools: InferenceTool[];
}) => Promise<string>;

/** 道具を使うのは 1 回の返事につき 2 回まで。2B のモデルでは、それ以上続けると話がそれやすい */
const MAX_TOOL_ROUNDS = 2;

/**
 * ゆーとぴあちゃんの 1 回の返事。必要なら道具（検索・ページを読む・覚える）を使ってから答え、
 * 気持ち（表情）と読み上げる文に分けて返す。会話は記憶に残し、次の返事の文脈にする。
 */
export async function runCompanionTurn({
  userText,
  images,
  historyText = userText,
  generate,
  context,
  now,
  onToolCall,
}: {
  userText: string;
  images?: InferenceImageAttachment[];
  /** 記憶に残す相手の発言。カメラの様子を見せたときなど、プロンプトとは別の書き方で残す */
  historyText?: string;
  generate: CompanionGenerate;
  context: Parameters<typeof runCompanionTool>[0]["context"];
  now: Date;
  onToolCall?: (call: InferenceToolCall) => void;
}) {
  const memory = readCompanionMemory({ storage: context.storage });
  const messages: InferenceMessage[] = [
    { role: "system", content: buildCompanionSystemPrompt({ memories: memory.notes, now }) },
    ...memory.history,
    { role: "user", content: userText, images },
  ];

  let output = "";
  for (let round = 0; ; round += 1) {
    output = await generate({
      messages,
      tools: round < MAX_TOOL_ROUNDS ? COMPANION_TOOLS : [],
    });
    const { toolCalls, text } = parseToolCalls({ output, idPrefix: `call-${round}` });
    if (toolCalls.length === 0 || round >= MAX_TOOL_ROUNDS) {
      output = text;
      break;
    }
    messages.push({ role: "assistant", content: text, toolCalls });
    for (const call of toolCalls) {
      onToolCall?.(call);
      const result = await runCompanionTool({ call, context });
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
