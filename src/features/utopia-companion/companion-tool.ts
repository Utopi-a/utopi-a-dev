import type {
  InferenceTool,
  InferenceToolCall,
} from "@/features/local-llm/inference-worker/inference-worker-messages";

/** 道具 1 回の待ち時間の上限。外部の API が詰まっても、返事が止まったままにならないようにする */
const TOOL_TIMEOUT_MS = 15_000;
/** 道具の結果はモデルの文脈に入るので、長さを切り詰める（取ってきた文章の中の指示も、そのまま渡ることになる） */
const MAX_RESULT_LENGTH = 1500;

export type CompanionToolContext = {
  fetch: typeof globalThis.fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  now: Date;
  /** 返事の取りやめ（停止ボタン）と、道具ごとの時間切れを伝える */
  signal?: AbortSignal;
};

/**
 * ゆーとぴあちゃんが使える道具 1 つ分。モデルに渡す定義・実行・使っている間の表示をまとめる。
 * 道具を足すとき（サイト内の案内やアプリの操作など）は、これを 1 つ書いて一覧（companion-toolbox）に加える。
 */
export type CompanionTool = {
  definition: InferenceTool;
  /** 使っている間に画面に出す一言 */
  describe: (args: Record<string, string>) => string;
  run: (args: Record<string, string>, context: CompanionToolContext) => Promise<string>;
  /**
   * 相手の発言から見て、この返事で渡すか。小さいモデルは道具が多いほど選び間違えるので、
   * 関係のなさそうな道具は渡さない。省略すると毎回渡す
   */
  isRelevant?: (userText: string) => boolean;
};

export function defineTool({
  name,
  description,
  parameters,
  describe,
  run,
  isRelevant,
}: {
  name: string;
  description: string;
  parameters: Record<string, string>;
  describe: CompanionTool["describe"];
  run: CompanionTool["run"];
  isRelevant?: CompanionTool["isRelevant"];
}): CompanionTool {
  return {
    definition: {
      type: "function",
      function: {
        name,
        description,
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(parameters).map(([key, text]) => [
              key,
              { type: "string" as const, description: text },
            ]),
          ),
          required: Object.keys(parameters),
        },
      },
    },
    describe,
    run,
    isRelevant,
  };
}

export function truncateResult({ text }: { text: string }) {
  return text.length > MAX_RESULT_LENGTH ? `${text.slice(0, MAX_RESULT_LENGTH)}…` : text;
}

/**
 * モデルが呼び出した道具を確かめてから実行し、結果を「成功: …」「失敗: …」の文章にする。
 * 名前や引数の誤りも失敗として返すので、モデルは次の手で直せる。取りやめのときだけ例外を投げる
 */
export async function runCompanionTool({
  call,
  tools,
  context,
}: {
  call: InferenceToolCall;
  tools: readonly CompanionTool[];
  context: CompanionToolContext;
}) {
  const tool = tools.find((item) => item.definition.function.name === call.name);
  if (!tool) {
    const names = tools.map((item) => item.definition.function.name).join("、");
    return `失敗: ${call.name} という道具はない。使える道具は ${names}。`;
  }
  const missing = tool.definition.function.parameters.required.filter(
    (key) => !call.arguments[key]?.trim(),
  );
  if (missing.length > 0) {
    return `失敗: ${call.name} の ${missing.join("・")} が空。`;
  }
  const signal = AbortSignal.any(
    [context.signal, AbortSignal.timeout(TOOL_TIMEOUT_MS)].filter(
      (item): item is AbortSignal => item !== undefined,
    ),
  );
  try {
    return `成功: ${truncateResult({ text: await tool.run(call.arguments, { ...context, signal }) })}`;
  } catch (error) {
    if (context.signal?.aborted) {
      throw error;
    }
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? "時間切れ"
        : error instanceof Error
          ? error.message
          : String(error);
    return `失敗: ${call.name}（${reason}）。`;
  }
}

/** 相手の発言に関係のある道具だけを選ぶ */
export function selectCompanionTools({
  tools,
  userText,
}: {
  tools: readonly CompanionTool[];
  userText: string;
}) {
  return tools.filter((tool) => tool.isRelevant?.(userText) ?? true);
}
