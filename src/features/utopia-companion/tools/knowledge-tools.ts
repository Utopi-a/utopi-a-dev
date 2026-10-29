import { type CompanionToolContext, defineTool } from "@/features/utopia-companion/companion-tool";

// 調べものの道具。どれも無料・キーなしで、ブラウザから直接呼ぶ
// （サーバーで中継すると、Vercel の共有 IP で各サービスの回数制限に当たり、任意の URL を取りに行く入口にもなる）。

const WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php";
const READER_ENDPOINT = "https://r.jina.ai/";
// Wikimedia の User-Agent ポリシーで、ブラウザからは Api-User-Agent で連絡先を名乗る
const WIKIPEDIA_HEADERS = {
  "Api-User-Agent": "utopi-a.dev utopia-companion (https://utopi-a.dev)",
};
const URL_PATTERN = /https?:\/\/\S+/;

async function fetchWikipedia({
  context,
  params,
}: {
  context: CompanionToolContext;
  params: Record<string, string>;
}) {
  const url = new URL(WIKIPEDIA_API);
  url.search = new URLSearchParams({ ...params, format: "json", origin: "*" }).toString();
  const response = await context.fetch(url, { headers: WIKIPEDIA_HEADERS, signal: context.signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as { query?: Record<string, unknown> };
}

async function searchWikipedia({
  context,
  query,
}: {
  context: CompanionToolContext;
  query: string;
}) {
  const search = await fetchWikipedia({
    context,
    params: { action: "query", list: "search", srsearch: query, srlimit: "3", srprop: "snippet" },
  });
  const hits = (search.query?.search ?? []) as { title: string; snippet: string }[];
  if (hits.length === 0) {
    return `「${query}」の記事は見つからなかった。言葉を変えて探すとよい。`;
  }
  const extract = await fetchWikipedia({
    context,
    params: {
      action: "query",
      prop: "extracts",
      explaintext: "1",
      exintro: "1",
      titles: hits[0].title,
    },
  });
  const pages = (extract.query?.pages ?? {}) as Record<string, { extract?: string }>;
  const summary = Object.values(pages)[0]?.extract?.trim() ?? "";
  // 冒頭の要約に答えがないこともあるので、検索語の周りの抜粋も添える
  const snippets = hits.map(
    ({ title, snippet }) => `・${title}: ${snippet.replace(/<[^>]+>/g, "")}`,
  );
  return [
    `記事「${hits[0].title}」の冒頭: ${summary || "（要約なし）"}`,
    "検索の抜粋:",
    ...snippets,
  ].join("\n");
}

async function readWebPage({ context, url }: { context: CompanionToolContext; url: string }) {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new Error("URL の形が正しくない");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("http か https の URL だけ読める");
  }
  const response = await context.fetch(`${READER_ENDPOINT}${target.href}`, {
    signal: context.signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.text()).trim();
}

export const KNOWLEDGE_TOOLS = [
  defineTool({
    name: "search_wikipedia",
    description:
      "日本語版ウィキペディアを検索し、記事の冒頭と検索語の周りの抜粋を返す。人・物・場所・歴史など、事典に載っていることの確認に使う。",
    parameters: { query: "検索する言葉（短い名詞がよい）" },
    describe: ({ query }) => `ウィキペディアで「${query ?? ""}」を調べてる…`,
    run: ({ query }, context) => searchWikipedia({ context, query }),
  }),
  defineTool({
    name: "read_web_page",
    description:
      "ウェブページの本文を Markdown で読む。相手が URL を渡したときや、検索で見つけたページを詳しく読むときに使う。",
    parameters: { url: "読むページの URL（http か https）" },
    describe: () => "ページを読んでる…",
    run: ({ url }, context) => readWebPage({ context, url }),
    isRelevant: (userText) => URL_PATTERN.test(userText),
  }),
];
