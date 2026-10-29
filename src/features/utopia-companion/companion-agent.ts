import type {
  InferenceImageAttachment,
  InferenceMessage,
  InferenceTool,
  InferenceToolCall,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import {
  appendCompanionHistory,
  MAX_HISTORY,
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
  | { type: "tool-done"; action: CompanionAction }
  | { type: "answering" };

/** 返事の途中で使った道具と、その結果。道具を本当に使ったかを画面で確かめられるようにする */
export type CompanionAction = {
  description: string;
  isSuccess: boolean;
  /** 道具がモデルに返した文章（成功: / 失敗: から始まる） */
  result: string;
};

/**
 * 1 回の返事で、道具を使って考え直せる回数と、道具を呼べる回数の上限。
 * 2B 級のモデルは長く続けるほど話がそれるので、短い探索で切り上げて分かったことを話させる
 */
const MAX_STEPS = 4;
const MAX_TOOL_CALLS = 6;

/**
 * 道具を使い切ったあとに答えさせる指示。道具を外しても、呼び出しのやり取りが見えていると小さいモデルは
 * 呼び出しを書き続けて返事が空になる（Node と ブラウザで確かめた）。やり取りは見せず、結果だけを文章で渡す
 */
const ANSWER_NOW =
  "（道具はもう使えない。上の調べた結果をもとに、気持ちのタグを付けて相手に返事をする。分からなかったことは正直に言う）";
/**
 * 「調べてみるね」と言うだけで道具を呼ばない返事を見分ける。思考なしの小さいモデルによくある
 * （URL を渡しても「読んでみようね」で終わった）ので、1 度だけ、いま呼び出すよう促す
 */
const PROMISE_PATTERN =
  /(調べ|読ん|読み|見て|見る|探し|探す|開い|開け|確かめ|検索[しす]?|呼ん|呼び|呼ぼ)(て|で)?(み)?(る|う|よう|ます|ね|よ)/;
const CALL_MARKUP_PATTERN = /<\/?(tool_call|function|parameter)\b/;
const ACT_NOW = "（言うだけで終わらせず、いま道具を呼び出して確かめてから話す）";

/** それでも答えられなかったときの返事 */
const FALLBACK_ANSWER = "[neutral] ごめん、うまく答えられなかった。もう一度聞いてみてくれる？";

/**
 * 思考モードを使うか。LFM3-1.7B で同じ質問を比べると、思考なしでも道具の選び方は崩れず、
 * 思考ありは雑談でも上限まで考え込んで、1 手が数倍遅くなった（Node の CPU で計測）
 */
const USES_THINKING = false;

/**
 * 呼び出しを書式どおりに書かず、文の中に道具の名前を書いた返事（「[search_web] 「…」検索ね」など）。
 * そのまま話して記憶に残すと、次の返事がそれをまねて道具を呼ばなくなる（ブラウザで続けて起きた）
 */
function mentionsTool({ text, toolNames }: { text: string; toolNames: readonly string[] }) {
  return CALL_MARKUP_PATTERN.test(text) || toolNames.some((name) => text.includes(name));
}

function callKey({ call }: { call: InferenceToolCall }) {
  return JSON.stringify([call.name, Object.entries(call.arguments).sort()]);
}

function nameOf(tool: CompanionTool) {
  return tool.definition.function.name;
}

function throwIfAborted({ signal }: { signal?: AbortSignal }) {
  if (signal?.aborted) {
    throw new DOMException("返事を取りやめた", "AbortError");
  }
}

/**
 * ゆーとぴあちゃんの 1 回の返事。考えて（思考モード）、必要なら道具を使い、結果を見て次の手を決める。
 * 呼び出しは名前と引数を確かめてから実行し、誤りは失敗として返して直させる。
 * 上限に達したら分かったことで答えさせ、気持ち（表情）と読み上げる文、使った道具に分けて返す。会話は記憶に残す。
 */
export async function runCompanionTurn({
  userText,
  images,
  historyText = userText,
  generate,
  tools = COMPANION_TOOLS,
  context,
  onStep,
  thinking = USES_THINKING,
}: {
  userText: string;
  images?: InferenceImageAttachment[];
  /** 記憶に残す相手の発言。カメラの様子を見せたときなど、プロンプトとは別の書き方で残す */
  historyText?: string;
  generate: CompanionGenerate;
  tools?: readonly CompanionTool[];
  context: CompanionToolContext;
  onStep?: (step: CompanionStep) => void;
  /** 思考モードで次の手を考えさせるか */
  thinking?: boolean;
}) {
  const memory = readCompanionMemory({ storage: context.storage });
  const available = selectCompanionTools({ tools, userText });
  const toolNames = tools.map(nameOf);
  const conversation: InferenceMessage[] = [
    {
      role: "system",
      content: buildCompanionSystemPrompt({
        memories: memory.notes,
        summary: memory.summary,
        now: context.now,
      }),
    },
    ...memory.history.slice(-MAX_HISTORY),
  ];
  const messages: InferenceMessage[] = [
    ...conversation,
    { role: "user", content: userText, images },
  ];

  // 同じ道具を同じ引数で呼び直すのは空回りなので、結果を使い回して答えさせる
  const results = new Map<string, string>();
  const actions: CompanionAction[] = [];
  let toolCallCount = 0;
  let hasNudged = false;
  let answer = "";
  for (let step = 0; step < MAX_STEPS; step += 1) {
    throwIfAborted({ signal: context.signal });
    onStep?.({ type: "thinking" });
    // 渡したあとで messages に足していくので、その時点の写しを渡す
    const output = await generate({
      messages: [...messages],
      tools: available.map((tool) => tool.definition),
      thinking,
    });
    const { visible, isComplete } = splitThinking({ output, isThinkingRequested: thinking });
    if (!isComplete) {
      break;
    }
    const { toolCalls, text } = parseToolCalls({ output: visible, idPrefix: `call-${step}` });
    if (toolCalls.length === 0) {
      const isPromise =
        PROMISE_PATTERN.test(text) || mentionsTool({ text, toolNames: available.map(nameOf) });
      if (!hasNudged && results.size === 0 && available.length > 0 && isPromise) {
        hasNudged = true;
        messages.push({ role: "assistant", content: text }, { role: "user", content: ACT_NOW });
        continue;
      }
      // 促しても呼び出しを文で書いたままなら、その文は話さずに答え直させる
      answer = mentionsTool({ text, toolNames }) ? "" : text;
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
          const description = tool?.describe(call.arguments) ?? `${call.name} を呼ぼうとした`;
          onStep?.({ type: "tool", call, description });
          result = await runCompanionTool({ call, tools: available, context });
          const action = { description, isSuccess: result.startsWith("成功:"), result };
          actions.push(action);
          onStep?.({ type: "tool-done", action });
        }
        results.set(key, result);
      }
      messages.push({ role: "tool", toolCallId: call.id, content: result });
    }
  }

  if (answer.length === 0) {
    throwIfAborted({ signal: context.signal });
    onStep?.({ type: "answering" });
    const findings = [...results.values()];
    const output = await generate({
      messages: [
        ...conversation,
        {
          role: "user",
          content:
            findings.length > 0
              ? `${userText}\n\n（調べた結果）\n${findings.join("\n\n")}\n\n${ANSWER_NOW}`
              : userText,
          images,
        },
      ],
      tools: [],
      thinking: false,
    });
    const { text } = parseToolCalls({
      output: splitThinking({ output }).visible,
      idPrefix: "final",
    });
    answer = mentionsTool({ text, toolNames }) ? "" : text;
  }

  const { expression, speech } = parseCompanionReply({ text: answer || FALLBACK_ANSWER });
  const reply = speech || "…";
  appendCompanionHistory({
    storage: context.storage,
    entries: [
      { role: "user", content: historyText },
      // 次の返事でも気持ちのタグを付けるよう、タグごと残す
      { role: "assistant", content: `[${expression}] ${reply}` },
    ],
  });
  return { expression, speech: reply, actions };
}
