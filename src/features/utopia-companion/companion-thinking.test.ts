import { describe, expect, it } from "vitest";
import { splitThinking } from "@/features/utopia-companion/companion-thinking";

describe("splitThinking", () => {
  it("思考と、その後の発言を分ける", () => {
    expect(
      splitThinking({ output: "<think>富士山を調べる</think>\n[smile] わかったよ。" }),
    ).toEqual({
      thinking: "富士山を調べる",
      visible: "[smile] わかったよ。",
      isComplete: true,
    });
  });

  it("閉じないまま終わった思考は、発言なしとして扱う", () => {
    expect(splitThinking({ output: "<think>まだ考えて" })).toEqual({
      thinking: "まだ考えて",
      visible: "",
      isComplete: false,
    });
  });

  it("思考を頼んだのに閉じタグがなければ、全体を考えている途中とみなす", () => {
    expect(splitThinking({ output: "We need to answer", isThinkingRequested: true })).toEqual({
      thinking: "We need to answer",
      visible: "",
      isComplete: false,
    });
  });

  it("思考がなければ全体を発言とする", () => {
    expect(splitThinking({ output: " [neutral] うん。 " })).toEqual({
      thinking: "",
      visible: "[neutral] うん。",
      isComplete: true,
    });
  });
});
