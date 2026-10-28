import { type CompanionToolContext, defineTool } from "@/features/utopia-companion/companion-tool";
import type { WebSearchSettings } from "@/features/utopia-companion/web-search/web-search-settings";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
/** Exa は他のサイトからのブラウザの呼び出しを受け付けないので、このサイトの経路で中継する（キーは保存しない） */
export const EXA_RELAY_PATH = "/api/companion/exa-search";
const MAX_RESULTS = 5;

type SearchHit = { title: string; url: string; text: string };

function describeFailure({ status }: { status: number }) {
  if (status === 401 || status === 403) {
    return "API キーが正しくない";
  }
  if (status === 402 || status === 429 || status === 432) {
    return "検索の回数の上限に達した";
  }
  return `HTTP ${status}`;
}

async function searchTavily({
  context,
  apiKey,
  query,
}: {
  context: CompanionToolContext;
  apiKey: string;
  query: string;
}) {
  const response = await context.fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      max_results: MAX_RESULTS,
      search_depth: "basic",
      include_answer: true,
    }),
    signal: context.signal,
  });
  if (!response.ok) {
    throw new Error(describeFailure({ status: response.status }));
  }
  const data = (await response.json()) as {
    answer?: string;
    results?: { title?: string; url?: string; content?: string }[];
  };
  return {
    answer: data.answer ?? "",
    hits: (data.results ?? []).map(({ title = "", url = "", content = "" }) => ({
      title,
      url,
      text: content,
    })),
  };
}

async function searchExa({
  context,
  apiKey,
  query,
}: {
  context: CompanionToolContext;
  apiKey: string;
  query: string;
}) {
  const response = await context.fetch(EXA_RELAY_PATH, {
    method: "POST",
    headers: { "x-exa-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal: context.signal,
  });
  if (!response.ok) {
    throw new Error(describeFailure({ status: response.status }));
  }
  const data = (await response.json()) as { results?: SearchHit[] };
  return { answer: "", hits: data.results ?? [] };
}

/** 使う人が API キーを入れたときだけ渡す、ネット検索の道具 */
export function createWebSearchTool({ settings }: { settings: WebSearchSettings }) {
  return defineTool({
    name: "search_web",
    description:
      "ネットを検索して、見つかったページの題名・URL・抜粋を返す。ニュース・お店・製品・最近の出来事など、事典に載っていないことや新しいことを調べるのに使う。",
    parameters: { query: "検索する言葉" },
    describe: ({ query }) => `ネットで「${query ?? ""}」を探してる…`,
    run: async ({ query }, context) => {
      const { answer, hits } =
        settings.provider === "tavily"
          ? await searchTavily({ context, apiKey: settings.apiKey, query })
          : await searchExa({ context, apiKey: settings.apiKey, query });
      if (hits.length === 0) {
        return `「${query}」では見つからなかった。言葉を変えて探すとよい。`;
      }
      return [
        answer ? `要約: ${answer}` : "",
        ...hits
          .slice(0, MAX_RESULTS)
          .map(
            ({ title, url, text }, index) =>
              `${index + 1}. ${title}（${url}）: ${text.replace(/\s+/g, " ").slice(0, 300)}`,
          ),
      ]
        .filter(Boolean)
        .join("\n");
    },
  });
}
