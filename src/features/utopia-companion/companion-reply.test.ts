import { describe, expect, it } from "vitest";
import {
  parseCompanionReply,
  parseLooseToolCall,
  parseToolCalls,
} from "@/features/utopia-companion/companion-reply";
import { COMPANION_TOOLS } from "@/features/utopia-companion/companion-toolbox";

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

describe("parseLooseToolCall", () => {
  const tools = COMPANION_TOOLS.map((tool) => tool.definition);

  it("知っている道具の名前のあとの 1 行か JSON を、呼び出しとして拾う", () => {
    expect(
      parseLooseToolCall({ text: "[search_wikipedia] 「日光東照宮」", tools, id: "call-0-0" }),
    ).toEqual({ id: "call-0-0", name: "search_wikipedia", arguments: { query: "日光東照宮" } });
    expect(
      parseLooseToolCall({
        text: '[smile] 探すね。[search_wikipedia]\n{"query": "富士山"}\n\n[waiting for result]',
        tools,
        id: "x",
      }),
    ).toEqual({ id: "x", name: "search_wikipedia", arguments: { query: "富士山" } });
  });

  it("気持ちのタグや知らない名前、引数のないものは拾わない", () => {
    expect(parseLooseToolCall({ text: "[smile] やっほー。", tools, id: "x" })).toBeNull();
    expect(parseLooseToolCall({ text: "[search_web] 富士山", tools, id: "x" })).toBeNull();
    expect(parseLooseToolCall({ text: "[search_wikipedia]", tools, id: "x" })).toBeNull();
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

  it("Markdown の飾りを外し、箇条書きは文として区切る", () => {
    expect(
      parseCompanionReply({
        text: "[smile] Lab にはいくつかあるよ！- **認証 Studio**：ログインの仕組み。- `実包管理帳簿`：帳簿をつける。",
      }),
    ).toEqual({
      expression: "smile",
      speech: "Lab にはいくつかあるよ！認証 Studio：ログインの仕組み。実包管理帳簿：帳簿をつける。",
    });
  });

  it("絵文字と、同じ文の言い直しは読まない", () => {
    expect(
      parseCompanionReply({
        text: "[shy] ちょっと疲れてるかな。ゆっくり休んでね😊 ちょっと疲れてるかな。",
      }),
    ).toEqual({ expression: "shy", speech: "ちょっと疲れてるかな。ゆっくり休んでね" });
  });

  it("タグがない・知らない名前なら neutral にし、文中のタグも読まない", () => {
    expect(parseCompanionReply({ text: "[angry] もう。[smile] 冗談だよ。" })).toEqual({
      expression: "neutral",
      speech: "もう。冗談だよ。",
    });
  });
});
