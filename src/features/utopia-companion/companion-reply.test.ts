import { describe, expect, it } from "vitest";
import { parseCompanionReply, parseToolCalls } from "@/features/utopia-companion/companion-reply";

describe("parseToolCalls", () => {
  it("LFM3 の <tool_call> から道具の名前と引数を取り出し、残りの文章を返す", () => {
    const output = [
      "ちょっと調べてみるね。",
      "<tool_call>",
      "<function=search_wikipedia>",
      "<parameter=query>",
      "富士山",
      "</parameter>",
      "</function>",
      "</tool_call>",
    ].join("\n");
    expect(parseToolCalls({ output, idPrefix: "call-0" })).toEqual({
      toolCalls: [{ id: "call-0-0", name: "search_wikipedia", arguments: { query: "富士山" } }],
      text: "ちょっと調べてみるね。",
    });
  });

  it("呼び出しがなければ文章だけを返す", () => {
    expect(parseToolCalls({ output: "[smile] やあ。", idPrefix: "call-0" })).toEqual({
      toolCalls: [],
      text: "[smile] やあ。",
    });
  });
});

describe("parseCompanionReply", () => {
  it("頭の気持ちのタグを表情にし、読み上げる文から外す", () => {
    expect(parseCompanionReply({ text: "[shy] えへへ、ありがとう。" })).toEqual({
      expression: "shy",
      speech: "えへへ、ありがとう。",
    });
  });

  it("思考の書き出しを読まず、文は 3 つまでにする", () => {
    expect(
      parseCompanionReply({
        text: "<think>調べた結果を見る</think>[smile] 1 つ目。2 つ目！3 つ目？4 つ目。",
      }),
    ).toEqual({ expression: "smile", speech: "1 つ目。2 つ目！3 つ目？" });
    expect(
      parseCompanionReply({ text: "[neutral] まだ分からない。もう一度調べよう。</think>" }),
    ).toEqual({
      expression: "neutral",
      speech: "まだ分からない。もう一度調べよう。",
    });
  });

  it("タグがない・知らない名前なら neutral にし、文中のタグも読まない", () => {
    expect(parseCompanionReply({ text: "[angry] もう。[smile] 冗談だよ。" })).toEqual({
      expression: "neutral",
      speech: "もう。 冗談だよ。",
    });
  });
});
