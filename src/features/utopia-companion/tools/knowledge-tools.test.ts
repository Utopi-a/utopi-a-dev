import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import { KNOWLEDGE_TOOLS } from "@/features/utopia-companion/tools/knowledge-tools";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function contextWith({ fetch }: { fetch: typeof globalThis.fetch }) {
  return { fetch, storage: createMemoryStorage(), now: new Date() };
}

describe("search_wikipedia", () => {
  it("最上位の記事の冒頭と、検索語の周りの抜粋をタグを外して返す", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            search: [
              { title: "日光東照宮", snippet: '<span class="searchmatch">元和</span>3年に創建' },
              { title: "日光市", snippet: "東照宮がある" },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ query: { pages: { "1": { extract: "栃木県の神社。" } } } }),
      );

    const result = await runCompanionTool({
      call: { id: "c", name: "search_wikipedia", arguments: { query: "日光東照宮" } },
      tools: KNOWLEDGE_TOOLS,
      context: contextWith({ fetch }),
    });

    expect(result).toBe(
      "成功: 記事「日光東照宮」の冒頭: 栃木県の神社。\n検索の抜粋:\n・日光東照宮: 元和3年に創建\n・日光市: 東照宮がある",
    );
    const searchUrl = new URL(String(fetch.mock.calls[0][0]));
    expect(searchUrl.searchParams.get("srsearch")).toBe("日光東照宮");
    expect(searchUrl.searchParams.get("origin")).toBe("*");
  });
});

describe("read_web_page", () => {
  it("http(s) の URL だけを Jina Reader で読み、ほかは失敗として返す", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(" 本文 "));
    const context = contextWith({ fetch });

    expect(
      await runCompanionTool({
        call: { id: "c", name: "read_web_page", arguments: { url: "file:///etc/passwd" } },
        tools: KNOWLEDGE_TOOLS,
        context,
      }),
    ).toBe("失敗: read_web_page（http か https の URL だけ読める）。");
    expect(fetch).not.toHaveBeenCalled();

    expect(
      await runCompanionTool({
        call: { id: "c", name: "read_web_page", arguments: { url: "https://example.com/a" } },
        tools: KNOWLEDGE_TOOLS,
        context,
      }),
    ).toBe("成功: 本文");
    expect(fetch.mock.calls[0][0]).toBe("https://r.jina.ai/https://example.com/a");
  });

  it("URL が含まれる発言のときだけ渡す", () => {
    const readWebPage = KNOWLEDGE_TOOLS.find(
      (tool) => tool.definition.function.name === "read_web_page",
    );
    expect(readWebPage?.isRelevant?.("これ読んで https://example.com")).toBe(true);
    expect(readWebPage?.isRelevant?.("やっほー")).toBe(false);
  });
});
