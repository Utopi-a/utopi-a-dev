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

describe("runCompanionTurn", () => {
  it("道具を使ってから答え、気持ちと読み上げる文に分け、会話を記憶に残す", async () => {
    const storage = createMemoryStorage();
    addCompanionNote({ storage, note: "相手の名前はりょう" });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ query: { search: [{ title: "富士山" }] } })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ query: { pages: { "1": { extract: "標高 3776 m。" } } } })),
      );
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(
        "<tool_call>\n<function=search_wikipedia>\n<parameter=query>\n富士山\n</parameter>\n</function>\n</tool_call>",
      )
      .mockResolvedValueOnce("[grin] 富士山は 3776 メートルあるんだって、りょう。");
    const onToolCall = vi.fn();

    const result = await runCompanionTurn({
      userText: "富士山って何メートル？",
      generate,
      context: { fetch, storage },
      now,
      onToolCall,
    });

    expect(result).toEqual({
      expression: "grin",
      speech: "富士山は 3776 メートルあるんだって、りょう。",
    });
    expect(onToolCall).toHaveBeenCalledWith({
      call: expect.objectContaining({ name: "search_wikipedia" }),
      description: "ウィキペディアで「富士山」を調べてる…",
    });

    const [first, second] = generate.mock.calls.map(([options]) => options);
    expect(first.messages[0].content).toContain("- 相手の名前はりょう");
    expect(first.messages[0].content).toContain("2026年10月29日");
    expect(first.tools.map((tool) => tool.function.name)).toEqual([
      "search_wikipedia",
      "read_web_page",
      "remember",
    ]);
    expect(second.messages.slice(-2)).toEqual([
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call-0-0", name: "search_wikipedia", arguments: { query: "富士山" } }],
      },
      { role: "tool", toolCallId: "call-0-0", content: "記事「富士山」: 標高 3776 m。" },
    ]);
    expect(readCompanionMemory({ storage }).history).toEqual([
      { role: "user", content: "富士山って何メートル？" },
      { role: "assistant", content: "[grin] 富士山は 3776 メートルあるんだって、りょう。" },
    ]);
  });

  it("道具は 2 回までで打ち切り、3 回目は道具なしで答えさせる", async () => {
    const storage = createMemoryStorage();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response("本文"));
    const readCall = (url: string) =>
      `<tool_call>\n<function=read_web_page>\n<parameter=url>\n${url}\n</parameter>\n</function>\n</tool_call>`;
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(readCall("https://example.com/a"))
      .mockResolvedValueOnce(readCall("https://example.com/b"))
      .mockResolvedValueOnce("[smile] 読んだよ。");

    const result = await runCompanionTurn({
      userText: "2 つのページを読んで",
      historyText: "（ページを渡した）",
      generate,
      context: { fetch, storage },
      now,
    });

    expect(result).toEqual({ expression: "smile", speech: "読んだよ。" });
    expect(generate.mock.calls.map(([options]) => options.tools.length)).toEqual([3, 3, 0]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(readCompanionMemory({ storage }).history[0]).toEqual({
      role: "user",
      content: "（ページを渡した）",
    });
  });

  it("同じ道具を同じ引数で呼び直したら、もう実行せずに道具なしで答えさせる", async () => {
    const storage = createMemoryStorage();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response("本文"));
    const call =
      "<tool_call>\n<function=read_web_page>\n<parameter=url>\nhttps://example.com\n</parameter>\n</function>\n</tool_call>";
    const generate = vi
      .fn<CompanionGenerate>()
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce("[neutral] 同じ内容だったよ。");

    const result = await runCompanionTurn({
      userText: "https://example.com 読んで",
      generate,
      context: { fetch, storage },
      now,
    });

    expect(result).toEqual({ expression: "neutral", speech: "同じ内容だったよ。" });
    expect(generate.mock.calls.map(([options]) => options.tools.length)).toEqual([3, 3, 0]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
