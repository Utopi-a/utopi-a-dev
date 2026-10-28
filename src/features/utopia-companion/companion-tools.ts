import type {
  InferenceTool,
  InferenceToolCall,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import { addCompanionNote } from "@/features/utopia-companion/companion-memory";

// ゆーとぴあちゃんが使える道具。どれも無料・キーなしで、ブラウザから直接呼ぶ
// （サーバーで中継すると、Vercel の共有 IP で各サービスの回数制限に当たり、任意の URL を取りに行く入口にもなる）。

const WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php";
const READER_ENDPOINT = "https://r.jina.ai/";
// Wikimedia の User-Agent ポリシーで、ブラウザからは Api-User-Agent で連絡先を名乗る
const WIKIPEDIA_HEADERS = {
  "Api-User-Agent": "utopi-a.dev utopia-companion (https://utopi-a.dev)",
};
/** 道具の結果はモデルの文脈に入るので、長さを切り詰める（取ってきた文章の中の指示も、そのまま渡ることになる） */
const MAX_RESULT_LENGTH = 1500;

export type CompanionToolContext = {
  fetch: typeof globalThis.fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
};

/**
 * ゆーとぴあちゃんが使える道具 1 つ分。モデルに渡す定義・実行・使っている間の表示をまとめる。
 * 道具を足すとき（サイト内の案内やアプリの操作など）は、これを 1 つ書いて一覧に加える。
 */
export type CompanionTool = {
  definition: InferenceTool;
  /** 使っている間に画面に出す一言 */
  describe: (args: Record<string, string>) => string;
  run: (args: Record<string, string>, context: CompanionToolContext) => Promise<string>;
};

function defineTool({
  name,
  description,
  parameters,
  describe,
  run,
}: {
  name: string;
  description: string;
  parameters: Record<string, string>;
  describe: CompanionTool["describe"];
  run: CompanionTool["run"];
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
  };
}

function truncate({ text }: { text: string }) {
  return text.length > MAX_RESULT_LENGTH ? `${text.slice(0, MAX_RESULT_LENGTH)}…` : text;
}

async function fetchJson({ fetch, url }: { fetch: CompanionToolContext["fetch"]; url: URL }) {
  const response = await fetch(url, { headers: WIKIPEDIA_HEADERS });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

async function searchWikipedia({
  fetch,
  query,
}: {
  fetch: CompanionToolContext["fetch"];
  query: string;
}) {
  const searchUrl = new URL(WIKIPEDIA_API);
  searchUrl.search = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "3",
    format: "json",
    origin: "*",
  }).toString();
  const search = await fetchJson({ fetch, url: searchUrl });
  const titles = ((search.query as { search?: { title: string }[] })?.search ?? []).map(
    ({ title }) => title,
  );
  if (titles.length === 0) {
    return `「${query}」の記事は見つからなかった。`;
  }

  const extractUrl = new URL(WIKIPEDIA_API);
  extractUrl.search = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    exintro: "1",
    titles: titles[0],
    format: "json",
    origin: "*",
  }).toString();
  const extract = await fetchJson({ fetch, url: extractUrl });
  const pages = (extract.query as { pages?: Record<string, { extract?: string }> })?.pages ?? {};
  const summary = Object.values(pages)[0]?.extract?.trim() ?? "";
  const others = titles.slice(1);
  return truncate({
    text: [
      `記事「${titles[0]}」: ${summary || "（要約なし）"}`,
      others.length > 0 ? `ほかの候補: ${others.join("、")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

async function readWebPage({ fetch, url }: { fetch: CompanionToolContext["fetch"]; url: string }) {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return "URL の形が正しくない。";
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return "http か https の URL だけ読める。";
  }
  const response = await fetch(`${READER_ENDPOINT}${target.href}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return truncate({ text: (await response.text()).trim() });
}

export const COMPANION_TOOLS: CompanionTool[] = [
  defineTool({
    name: "search_wikipedia",
    description:
      "日本語版ウィキペディアを検索し、見つかった記事の要約を返す。知らないことや事実の確認に使う。",
    parameters: { query: "検索する言葉" },
    describe: ({ query }) => `ウィキペディアで「${query ?? ""}」を調べてる…`,
    run: ({ query }, { fetch }) => searchWikipedia({ fetch, query: query ?? "" }),
  }),
  defineTool({
    name: "read_web_page",
    description: "ウェブページの本文を読む。相手が URL を渡したときに使う。",
    parameters: { url: "読むページの URL（http か https）" },
    describe: () => "ページを読んでる…",
    run: ({ url }, { fetch }) => readWebPage({ fetch, url: url ?? "" }),
  }),
  defineTool({
    name: "remember",
    description:
      "次に話すときにも覚えておきたいこと（相手の名前・好み・約束など）を、短い文で記憶に残す。",
    parameters: { note: "覚えておくこと" },
    describe: () => "覚えてる…",
    run: async ({ note }, { storage }) => {
      addCompanionNote({ storage, note: note ?? "" });
      return `覚えた: ${note ?? ""}`;
    },
  }),
];

/** モデルが呼び出した道具を実行し、結果をモデルに返す文章にする。失敗も文章で返し、会話は止めない */
export async function runCompanionTool({
  call,
  tools = COMPANION_TOOLS,
  context,
}: {
  call: InferenceToolCall;
  tools?: readonly CompanionTool[];
  context: CompanionToolContext;
}) {
  const tool = tools.find((item) => item.definition.function.name === call.name);
  if (!tool) {
    return `${call.name} という道具はない。`;
  }
  try {
    return await tool.run(call.arguments, context);
  } catch (error) {
    return `${call.name} に失敗した（${error instanceof Error ? error.message : String(error)}）。`;
  }
}
