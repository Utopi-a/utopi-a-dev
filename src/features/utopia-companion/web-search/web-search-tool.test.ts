import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import { createWebSearchTool } from "@/features/utopia-companion/web-search/web-search-tool";

function contextWith({ fetch }: { fetch: typeof globalThis.fetch }) {
  return { fetch, storage: createMemoryStorage(), now: new Date() };
}

describe("search_web", () => {
  it("Tavily には使う人のキーでブラウザから直接問い合わせ、要約と結果を返す", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        answer: "つくばには人気のラーメン店が多い。",
        results: [{ title: "つくばラーメン", url: "https://example.com/r", content: "人気の\n店" }],
      }),
    );
    const tool = createWebSearchTool({ settings: { provider: "tavily", apiKey: "tvly-test" } });

    const result = await runCompanionTool({
      call: { id: "c", name: "search_web", arguments: { query: "つくば ラーメン" } },
      tools: [tool],
      context: contextWith({ fetch }),
    });

    expect(result).toBe(
      "成功: 要約: つくばには人気のラーメン店が多い。\n1. つくばラーメン（https://example.com/r）: 人気の 店",
    );
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.tavily.com/search");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tvly-test");
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({ query: "つくば ラーメン" }),
    );
  });

  it("Exa はこのサイトの中継経路にキーを付けて問い合わせる", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json({ results: [{ title: "Exa", url: "https://exa.ai", text: "検索" }] }),
      );
    const tool = createWebSearchTool({ settings: { provider: "exa", apiKey: "exa-test" } });

    const result = await runCompanionTool({
      call: { id: "c", name: "search_web", arguments: { query: "exa" } },
      tools: [tool],
      context: contextWith({ fetch }),
    });

    expect(result).toBe("成功: 1. Exa（https://exa.ai）: 検索");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/companion/exa-search");
    expect(new Headers(init?.headers).get("x-exa-api-key")).toBe("exa-test");
  });

  it("キーの誤りや回数の上限は、分かる言葉の失敗として返す", async () => {
    const tool = createWebSearchTool({ settings: { provider: "tavily", apiKey: "bad" } });
    for (const [status, reason] of [
      [401, "API キーが正しくない"],
      [432, "検索の回数の上限に達した"],
    ] as const) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("", { status }));
      expect(
        await runCompanionTool({
          call: { id: "c", name: "search_web", arguments: { query: "x" } },
          tools: [tool],
          context: contextWith({ fetch }),
        }),
      ).toBe(`失敗: search_web（${reason}）。`);
    }
  });
});
