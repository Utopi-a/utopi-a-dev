import type {
  InferenceImageAttachment,
  InferenceMessage,
  InferenceTool,
  InferenceToolCall,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import {
  appendCompanionHistory,
  type CompanionHistoryCall,
  type CompanionHistoryEntry,
  MAX_HISTORY,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import { buildCompanionSystemPrompt } from "@/features/utopia-companion/companion-persona";
import {
  parseCompanionReply,
  parseLooseToolCall,
  parseToolCalls,
} from "@/features/utopia-companion/companion-reply";
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
  "（道具はもう使えない。上の道具の結果をもとに、気持ちのタグを付けて相手に返事をする。分からなかったことは正直に言う）";
/**
 * 答えさせるときに道具の結果の前に付ける見出し。「調べた結果」としていたら、remember のあとに
 * 返事へそのまま書き写したので、調べもの以外にも合う言葉にし、書き写したら外す
 */
const FINDINGS_LABEL = "（使った道具の結果）";
/**
 * 「調べてみるね」と言うだけで道具を呼ばない返事を見分ける。思考なしの小さいモデルによくある
 * （URL を渡しても「読んでみようね」で終わった）ので、1 度だけ、いま呼び出すよう促す
 */
const PROMISE_PATTERN =
  /(調べ|読ん|読み|見て|見る|探し|探す|開い|開け|確かめ|検索[しす]?|呼ん|呼び|呼ぼ)(て|で)?(み)?(る|う|よう|ます|ね|よ)/;
const ACT_NOW = "（言うだけで終わらせず、いま道具を呼び出して確かめてから話す）";
/** 相手がはっきり道具を使う頼みごとをした発言。道具を使わずに返したら 1 度だけ促す */
const REQUEST_PATTERN = /(調べ|探し|読ん|検索し)て/;
/**
 * 「覚えておいて」「忘れないで」とはっきり頼んだ発言（「覚えてる？」は聞いているだけなので含めない）。
 * ブラウザの LFM3-1.7B は、前の会話がないと 6 回中 1 回、前の会話があると 6 回中 3 回、remember を呼ばずに
 * 「覚えたよ」とだけ返した。remember を名指しして促しても呼ばなかったので、呼ばなければ相手の言葉を
 * そのまま覚える（API の tool_choice で道具を指定するのに当たる）
 */
const REMEMBER_REQUEST_PATTERN = /覚えて(?:おいて|ね|て|よ)?(?![いるたな])|覚えといて|忘れないで/;

/** 相手が道具を使う頼みごと（調べて・覚えてなど）をはっきりしたか */
export function asksForAction(userText: string) {
  return REQUEST_PATTERN.test(userText) || REMEMBER_REQUEST_PATTERN.test(userText);
}

/** 覚えてと頼んだ発言から、頼む部分を除いた覚えること。頼んでいなければ null */
export function noteFromRequest(userText: string) {
  if (!REMEMBER_REQUEST_PATTERN.test(userText)) {
    return null;
  }
  const note = userText
    .split(/[。、！!？?\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !REMEMBER_REQUEST_PATTERN.test(part))
    .join("、");
  return note || null;
}
const CALL_MARKUP_PATTERN = /<\/?(tool_call|function|parameter)\b/;
/** 道具の結果を会話の記憶に残す長さ。次からの返事のプロンプトに毎回入るので短くする */
const MAX_STORED_RESULT = 200;

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

/**
 * 記憶に残した会話を、プロンプトのメッセージに戻す。道具を使った返事は、呼び出しと結果のやり取りとして見せ直す。
 * 返事の文だけを残すと「覚えておいて」に「覚えたよ」と答えた前例だけが見え、それをまねて remember を
 * 呼ばなくなった（前例 1 つで、ブラウザでの成功が 6 回中 5 回から 3 回に落ちた）
 */
function toPromptMessages({ history }: { history: CompanionHistoryEntry[] }): InferenceMessage[] {
  return history.flatMap((entry, index): InferenceMessage[] => {
    if (!entry.calls?.length) {
      return [{ role: entry.role, content: entry.content }];
    }
    const toolCalls = entry.calls.map((call, order) => ({
      id: `past-${index}-${order}`,
      name: call.name,
      arguments: call.arguments,
    }));
    return [
      { role: "assistant", content: "", toolCalls },
      ...entry.calls.map(
        (call, order): InferenceMessage => ({
          role: "tool",
          toolCallId: toolCalls[order].id,
          content: call.result,
        }),
      ),
      { role: "assistant", content: entry.content },
    ];
  });
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
  const system: InferenceMessage = {
    role: "system",
    content: buildCompanionSystemPrompt({
      memories: memory.notes,
      summary: memory.summary,
      now: context.now,
    }),
  };
  const recent = memory.history.slice(-MAX_HISTORY);
  const messages: InferenceMessage[] = [
    system,
    ...toPromptMessages({ history: recent }),
    { role: "user", content: userText, images },
  ];

  // 同じ道具を同じ引数で呼び直すのは空回りなので、結果を使い回して答えさせる
  const results = new Map<string, string>();
  const actions: CompanionAction[] = [];
  const calls: CompanionHistoryCall[] = [];
  const requestedNote = noteFromRequest(userText);
  const canRemember = available.some((tool) => nameOf(tool) === "remember");
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
    const parsed = parseToolCalls({ output: visible, idPrefix: `call-${step}` });
    const loose =
      parsed.toolCalls.length === 0
        ? parseLooseToolCall({
            text: parsed.text,
            tools: available.map((tool) => tool.definition),
            id: `call-${step}-0`,
          })
        : null;
    const forcedNote =
      parsed.toolCalls.length === 0 &&
      !loose &&
      requestedNote &&
      canRemember &&
      !calls.some((call) => call.name === "remember")
        ? requestedNote
        : null;
    // 書式どおりでない呼び出しを拾ったときや、代わりに覚えるときは、その文は会話に残さない（まねるので）
    const { toolCalls, text } = loose
      ? { toolCalls: [loose], text: "" }
      : forcedNote
        ? {
            toolCalls: [
              { id: `call-${step}-0`, name: "remember", arguments: { note: forcedNote } },
            ],
            text: "",
          }
        : parsed;
    if (toolCalls.length === 0) {
      const isPromise =
        PROMISE_PATTERN.test(text) ||
        mentionsTool({ text, toolNames: available.map(nameOf) }) ||
        asksForAction(userText);
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
          calls.push({
            name: call.name,
            arguments: call.arguments,
            result: result.slice(0, MAX_STORED_RESULT),
          });
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
      // 道具を外して答えさせるので、前の返事の呼び出しのやり取りも見せない（見えると呼び出しを書き続ける）
      messages: [
        system,
        ...recent.map(({ role, content }) => ({ role, content })),
        {
          role: "user",
          content:
            findings.length > 0
              ? `${userText}\n\n${FINDINGS_LABEL}\n${findings.join("\n\n")}\n\n${ANSWER_NOW}`
              : userText,
          images,
        },
      ],
      tools: [],
      thinking: false,
    });
    const { text: rawText } = parseToolCalls({
      output: splitThinking({ output }).visible,
      idPrefix: "final",
    });
    const text = rawText.replaceAll(FINDINGS_LABEL, "").trim();
    answer = mentionsTool({ text, toolNames }) ? "" : text;
  }

  const { expression, speech } = parseCompanionReply({ text: answer || FALLBACK_ANSWER });
  const reply = speech || "…";
  appendCompanionHistory({
    storage: context.storage,
    entries: [
      { role: "user", content: historyText },
      // 次の返事でも気持ちのタグを付けるよう、タグごと残す
      {
        role: "assistant",
        content: `[${expression}] ${reply}`,
        ...(calls.length > 0 ? { calls } : {}),
      },
    ],
  });
  return { expression, speech: reply, actions };
}
