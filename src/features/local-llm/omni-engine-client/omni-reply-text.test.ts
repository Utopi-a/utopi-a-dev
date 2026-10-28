import { describe, expect, it } from "vitest";
import {
  nextReplyDelta,
  systemTextFor,
} from "@/features/local-llm/omni-engine-client/omni-reply-text";

describe("nextReplyDelta", () => {
  it("前回までの返答に続く部分だけを返す", () => {
    expect(nextReplyDelta({ previous: "東京の", current: "東京の明日" })).toEqual({
      settled: "東京の明日",
      delta: "明日",
    });
  });

  it("末尾で切れたマルチバイト文字は確定するまで送らず、確定後に一度だけ足す", () => {
    const partial = nextReplyDelta({ previous: "", current: "晴れのち�" });
    expect(partial).toEqual({ settled: "晴れのち", delta: "晴れのち" });

    const settled = nextReplyDelta({ previous: "晴れのち", current: "晴れのち曇り" });
    expect(settled).toEqual({ settled: "晴れのち曇り", delta: "曇り" });
  });

  it("前回までの返答に続かないときは null を返す", () => {
    expect(nextReplyDelta({ previous: "abc", current: "xyz" })).toBeNull();
  });
});

describe("systemTextFor", () => {
  it("モデルカードの書き方で各モードの system 文を作り、テキストと音声の返答は話しかけた言語に合わせる", () => {
    expect(systemTextFor({ replyMode: { mode: "text" } })).toBe("");
    expect(systemTextFor({ replyMode: { mode: "interleaved" } })).toBe(
      "Always reply in the same language the user speaks. Respond with interleaved text and audio.",
    );
    expect(systemTextFor({ replyMode: { mode: "transcribe", language: "Japanese" } })).toBe(
      "Perform ASR in Japanese.",
    );
    expect(systemTextFor({ replyMode: { mode: "speech", language: "English" } })).toBe(
      "Perform TTS in English using a female voice.",
    );
  });
});
