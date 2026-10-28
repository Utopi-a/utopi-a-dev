import { describe, expect, it, vi } from "vitest";
import { relayExaSearch } from "@/features/utopia-companion/server/relay-exa-search";

function relayRequest({
  site = "same-origin",
  key = "exa-key",
  body = { query: "つくば" },
}: {
  site?: string | null;
  key?: string | null;
  body?: unknown;
}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (site) {
    headers.set("sec-fetch-site", site);
  }
  if (key) {
    headers.set("x-exa-api-key", key);
  }
  return new Request("https://utopi-a.dev/api/companion/exa-search", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("relayExaSearch", () => {
  it("このサイトのページからの呼び出しを、使う人のキーで Exa の検索だけに中継する", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        results: [{ title: "A", url: "https://a.example", text: "本文", score: 1 }],
      }),
    );

    const response = await relayExaSearch({ request: relayRequest({}), fetch });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [{ title: "A", url: "https://a.example", text: "本文" }],
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.exa.ai/search");
    expect(new Headers(init?.headers).get("x-api-key")).toBe("exa-key");
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({ query: "つくば", numResults: 5 }),
    );
  });

  it("他のサイトからの呼び出し・キーなし・長すぎる言葉は、中継せずに断る", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    for (const [request, status] of [
      [relayRequest({ site: "cross-site" }), 403],
      [relayRequest({ site: null }), 403],
      [relayRequest({ key: null }), 400],
      [relayRequest({ body: { query: "あ".repeat(301) } }), 400],
      [relayRequest({ body: { query: 1 } }), 400],
    ] as const) {
      expect((await relayExaSearch({ request, fetch })).status).toBe(status);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Exa の失敗は状態だけを返し、応答の本文は渡さない", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("invalid key exa-key", { status: 401 }));

    const response = await relayExaSearch({ request: relayRequest({}), fetch });

    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).not.toContain("exa-key");
  });
});
