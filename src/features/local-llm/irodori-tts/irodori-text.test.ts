import { describe, expect, it } from "vitest";
import {
  buildDurationFeatures,
  findFlatteningFrame,
  isJapaneseSpeech,
  normalizeIrodoriText,
  splitSpeechSentences,
  takeFinishedSpeech,
} from "@/features/local-llm/irodori-tts/irodori-text";

describe("normalizeIrodoriText", () => {
  it("Irodori-TTS の前処理と同じく記号を置き換え、全体を囲む括弧を外して NFKC にする", () => {
    expect(normalizeIrodoriText({ text: "「こんにちは！　元気？」" })).toBe("こんにちは!元気?");
    expect(normalizeIrodoriText({ text: "ＡＢＣ〜です..." })).toBe("ABCーです…");
  });

  it("途中で閉じる括弧は外さない", () => {
    expect(normalizeIrodoriText({ text: "「はい」と「いいえ」" })).toBe("「はい」と「いいえ」");
  });
});

describe("buildDurationFeatures", () => {
  it("文字種と句読点の数から、Python 版と同じ 14 個の特徴量を作る", () => {
    const features = buildDurationFeatures({
      text: "こんにちは、今日はいい天気ですね。散歩に行きませんか?",
      tokenCount: 20,
      maxTextLength: 256,
      annotationEmojis: ["😊"],
      hasSpeaker: false,
    });
    const expected = [
      0.078125, 0.5339835277881079, 0.7407407407407407, 0.3154648767857287, 0.244650542118226, 0, 0,
      0, 0.3154648767857287, 0, 0.6296296296296297, 0.25925925925925924, 0, 0,
    ];
    expect(
      [...features].map((value, index) => value - expected[index]).every((d) => Math.abs(d) < 1e-6),
    ).toBe(true);
  });

  it("話者の手本があるときは最後の特徴量を 1 にする", () => {
    const features = buildDurationFeatures({
      text: "こんにちは。",
      tokenCount: 4,
      maxTextLength: 256,
      annotationEmojis: [],
      hasSpeaker: true,
    });
    expect(features.at(-1)).toBe(1);
  });
});

describe("findFlatteningFrame", () => {
  it("末尾が平らでゼロに近くなる最初のフレームを返す", () => {
    const dims = 2;
    const latent = Float32Array.from([1, -1, 0.8, -0.9, 1.2, -1.1, 0, 0, 0, 0, 0, 0]);
    expect(
      findFlatteningFrame({
        latent,
        frames: 6,
        dims,
        windowSize: 2,
        stdThreshold: 0.05,
        meanThreshold: 0.1,
      }),
    ).toBe(3);
  });
});

describe("takeFinishedSpeech", () => {
  it("生成中は最後の文末記号までを取り出し、続きは次に回す", () => {
    expect(
      takeFinishedSpeech({
        text: "はい。富士山です。標高は",
        from: 0,
        isFinal: false,
        minLength: 1,
      }),
    ).toEqual({
      speech: "はい。富士山です。",
      next: 9,
    });
    expect(
      takeFinishedSpeech({
        text: "はい。富士山です。標高は",
        from: 9,
        isFinal: false,
        minLength: 1,
      }),
    ).toEqual({ speech: "", next: 9 });
  });

  it("言い終えた部分が短いうちは、次の文が届くまで待つ", () => {
    expect(takeFinishedSpeech({ text: "はい！富士山は", from: 0, isFinal: false })).toEqual({
      speech: "",
      next: 0,
    });
    expect(
      takeFinishedSpeech({ text: "はい！富士山は日本で一番高い山です。", from: 0, isFinal: false }),
    ).toEqual({ speech: "はい！富士山は日本で一番高い山です。", next: 18 });
  });

  it("返答が終わったら残りを全部返す", () => {
    expect(
      takeFinishedSpeech({ text: "はい。富士山です。標高は3776m", from: 9, isFinal: true }),
    ).toEqual({ speech: "標高は3776m", next: 17 });
  });
});

describe("isJapaneseSpeech", () => {
  it("かなか漢字を含む文だけを日本語として読む", () => {
    expect(isJapaneseSpeech({ text: "富士山は3776mです。" })).toBe(true);
    expect(isJapaneseSpeech({ text: "Mount Fuji is 3,776 m tall." })).toBe(false);
  });
});

describe("splitSpeechSentences", () => {
  it("文末で分け、短すぎる文は次の文とまとめ、Markdown の記号は読まない", () => {
    expect(
      splitSpeechSentences({
        text: "はい。**富士山**は日本で一番高い山です。標高は3776メートルです！",
      }),
    ).toEqual(["はい。富士山は日本で一番高い山です。", "標高は3776メートルです！"]);
  });

  it("箇条書きの記号を読まず、行ごとに文末を補ってまとめる", () => {
    expect(
      splitSpeechSentences({ text: "- 標高: 3,776m\n- 場所: 静岡県と山梨県\n1. 晴れた日に行く" }),
    ).toEqual(["標高: 3,776m。場所: 静岡県と山梨県。", "晴れた日に行く。"]);
  });
});
