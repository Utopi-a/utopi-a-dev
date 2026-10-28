import { describe, expect, it, vi } from "vitest";
import {
  type CompanionGenerate,
  runCompanionTurn,
} from "@/features/utopia-companion/companion-agent";
import {
  addCompanionNote,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";

const now = new Date("2026-10-29T10:00:00+09:00");

function toolCall({ name, args }: { name: string; args: Record<string, string> }) {
  const parameters = Object.entries(args)
    .map(([key, value]) => `<parameter=${key}>\n${value}\n</parameter>`)
    .join("\n");
  return `<tool_call>\n<function=${name}>\n${parameters}\n</function>\n</tool_call>`;
}

function wikipediaFetch() {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (input) =>
      String(input).includes("list=search")
        ? new Response(
            JSON.stringify({ query: { search: [{ title: "富士山", snippet: "標高" }] } }),
          )
        : new Response(JSON.stringify({ query: { pages: { "1": { extract: "標高 3776 m。" } } } })),
    );
}

describe("runCompanionTurn", () => {
  it("考えてから道具を使い、結果を見て答え、気持ちと読み上げる文に分けて会話を残す", async () => {
    const storage = createMemoryStorage();
    addCompanionNote({ storage, note: "相手の名前はりょう" });
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(
        `<think>調べよう</think>\n${toolCall({ name: "search_wikipedia", args: { query: "富士山" } })}`,
      )
      .mockResolvedValueOnce(
        "<think>3776 m だ</think>\n[grin] 富士山は 3776 メートルだって、りょう。",
      );
    const onStep = vi.fn();

    const result = await runCompanionTurn({
      userText: "富士山って何メートル？",
      generate,
      context: { fetch: wikipediaFetch(), storage, now },
      onStep,
    });

    expect(result).toEqual({
      expression: "grin",
      speech: "富士山は 3776 メートルだって、りょう。",
    });
    expect(onStep.mock.calls.map(([step]) => step.type)).toEqual(["thinking", "tool", "thinking"]);
    expect(onStep).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tool",
        description: "ウィキペディアで「富士山」を調べてる…",
      }),
    );

    const [first, second] = generate.mock.calls.map(([options]) => options);
    expect(first.thinking).toBe(true);
    expect(first.messages[0].content).toContain("- 相手の名前はりょう");
    expect(first.messages[0].content).toContain("2026年10月29日");
    // URL のない発言なので、ページを読む道具は渡さない
    expect(first.tools.map((tool) => tool.function.name)).toEqual(["search_wikipedia", "remember"]);
    expect(second.messages.at(-1)).toEqual({
      role: "tool",
      toolCallId: "call-0-0",
      content: expect.stringMatching(/^成功: 記事「富士山」の冒頭: 標高 3776 m。/),
    });
    expect(readCompanionMemory({ storage }).history).toEqual([
      { role: "user", content: "富士山って何メートル？" },
      { role: "assistant", content: "[grin] 富士山は 3776 メートルだって、りょう。" },
    ]);
  });

  it("思考の中に書いた呼び出しは実行しない", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(
        `<think>${toolCall({ name: "search_wikipedia", args: { query: "x" } })} は要らない</think>[smile] やっほー。`,
      );

    const result = await runCompanionTurn({
      userText: "やっほー",
      generate,
      context: { fetch, storage: createMemoryStorage(), now },
    });

    expect(result).toEqual({ expression: "smile", speech: "やっほー。" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("引数の欠けた呼び出しは失敗として返し、直した呼び出しで続ける", async () => {
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(toolCall({ name: "search_wikipedia", args: {} }))
      .mockResolvedValueOnce(toolCall({ name: "search_wikipedia", args: { query: "富士山" } }))
      .mockResolvedValueOnce("[smile] 分かったよ。");

    const result = await runCompanionTurn({
      userText: "富士山を調べて",
      generate,
      context: { fetch: wikipediaFetch(), storage: createMemoryStorage(), now },
    });

    expect(result).toEqual({ expression: "smile", speech: "分かったよ。" });
    expect(generate.mock.calls[1][0].messages.at(-1)).toEqual({
      role: "tool",
      toolCallId: "call-0-0",
      content: "失敗: search_wikipedia の query が空。",
    });
  });

  it("道具を使い続けたら 4 手で切り上げ、道具も思考もなしで分かったことを答えさせる", async () => {
    const generate = vi.fn<CompanionGenerate>();
    for (const query of ["a", "b", "c", "d"]) {
      generate.mockResolvedValueOnce(toolCall({ name: "search_wikipedia", args: { query } }));
    }
    generate.mockResolvedValueOnce("[neutral] はっきりは分からなかった。");

    const result = await runCompanionTurn({
      userText: "いろいろ調べて",
      generate,
      context: { fetch: wikipediaFetch(), storage: createMemoryStorage(), now },
    });

    expect(result).toEqual({ expression: "neutral", speech: "はっきりは分からなかった。" });
    expect(
      generate.mock.calls.map(([options]) => [options.tools.length, options.thinking]),
    ).toEqual([
      [2, true],
      [2, true],
      [2, true],
      [2, true],
      [0, false],
    ]);
    expect(generate.mock.calls[4][0].messages.at(-1)).toEqual({
      role: "user",
      content: expect.stringContaining("道具はもう使えない"),
    });
  });

  it("同じ呼び出しを繰り返したら、もう実行せずに答えさせる", async () => {
    const fetch = wikipediaFetch();
    const call = toolCall({ name: "search_wikipedia", args: { query: "富士山" } });
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce("[neutral] 同じ結果だったよ。");

    const result = await runCompanionTurn({
      userText: "富士山を調べて",
      generate,
      context: { fetch, storage: createMemoryStorage(), now },
    });

    expect(result.speech).toBe("同じ結果だったよ。");
    // 検索と冒頭の取得で 2 回。繰り返しの呼び出しでは取りに行かない
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls.map(([options]) => options.thinking)).toEqual([true, true, false]);
  });

  it("考えている途中で上限に達したら、思考なしで答え直させる", async () => {
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce("<think>えっと、どうしよう")
      .mockResolvedValueOnce("[shy] えへへ、なんでもないよ。");

    const result = await runCompanionTurn({
      userText: "ねえねえ",
      generate,
      context: { fetch: vi.fn(), storage: createMemoryStorage(), now },
    });

    expect(result).toEqual({ expression: "shy", speech: "えへへ、なんでもないよ。" });
    expect(generate.mock.calls[1][0]).toEqual(
      expect.objectContaining({ tools: [], thinking: false }),
    );
  });

  it("取りやめたら返事を作らず、会話も残さない", async () => {
    const storage = createMemoryStorage();
    const controller = new AbortController();
    const generate = vi.fn<CompanionGenerate>().mockImplementation(async () => {
      controller.abort();
      return toolCall({ name: "search_wikipedia", args: { query: "富士山" } });
    });

    await expect(
      runCompanionTurn({
        userText: "富士山を調べて",
        generate,
        context: { fetch: wikipediaFetch(), storage, now, signal: controller.signal },
      }),
    ).rejects.toThrow();
    expect(readCompanionMemory({ storage }).history).toEqual([]);
  });
});
