import { describe, expect, it, vi } from "vitest";
import { readCompanionMemory } from "@/features/utopia-companion/companion-memory";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tools";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

describe("runCompanionTool", () => {
  it("search_wikipedia は検索の最上位の記事の要約と、ほかの候補を返す", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ query: { search: [{ title: "富士山" }, { title: "富士山本宮浅間大社" }] } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ query: { pages: { "1": { extract: "富士山は日本最高峰の山。" } } } }),
      );
    const result = await runCompanionTool({
      call: { id: "c", name: "search_wikipedia", arguments: { query: "富士山" } },
      context: { fetch, storage: createMemoryStorage() },
    });
    expect(result).toBe("記事「富士山」: 富士山は日本最高峰の山。\nほかの候補: 富士山本宮浅間大社");
    const searchUrl = new URL(String(fetch.mock.calls[0][0]));
    expect(searchUrl.searchParams.get("srsearch")).toBe("富士山");
    expect(searchUrl.searchParams.get("origin")).toBe("*");
  });

  it("read_web_page は http(s) 以外を読まず、本文は長さを切り詰める", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("あ".repeat(2000)));
    const context = { fetch, storage: createMemoryStorage() };

    expect(
      await runCompanionTool({
        call: { id: "c", name: "read_web_page", arguments: { url: "file:///etc/passwd" } },
        context,
      }),
    ).toBe("http か https の URL だけ読める。");
    expect(fetch).not.toHaveBeenCalled();

    const result = await runCompanionTool({
      call: { id: "c", name: "read_web_page", arguments: { url: "https://example.com/a" } },
      context,
    });
    expect(fetch).toHaveBeenCalledWith("https://r.jina.ai/https://example.com/a");
    expect(result).toHaveLength(1501);
  });

  it("remember は記憶に残し、失敗や知らない道具は文章で返す", async () => {
    const storage = createMemoryStorage();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("", { status: 429 }));

    expect(
      await runCompanionTool({
        call: { id: "c", name: "remember", arguments: { note: "相手はラベンダーが好き" } },
        context: { fetch, storage },
      }),
    ).toBe("覚えた: 相手はラベンダーが好き");
    expect(readCompanionMemory({ storage }).notes).toEqual(["相手はラベンダーが好き"]);

    expect(
      await runCompanionTool({
        call: { id: "c", name: "search_wikipedia", arguments: { query: "x" } },
        context: { fetch, storage },
      }),
    ).toBe("search_wikipedia に失敗した（HTTP 429）。");
    expect(
      await runCompanionTool({
        call: { id: "c", name: "fly", arguments: {} },
        context: { fetch, storage },
      }),
    ).toBe("fly という道具はない。");
  });
});
