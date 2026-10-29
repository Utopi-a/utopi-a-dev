import { describe, expect, it } from "vitest";
import {
  buildSceneMessages,
  buildSceneTurn,
  hasFrameChanged,
  isSimilarScene,
  withScene,
} from "@/features/utopia-companion/camera/companion-scene";

describe("isSimilarScene", () => {
  it("言い回しが少し違うだけの同じ様子は似ているとし、別の様子は似ていないとする", () => {
    expect(
      isSimilarScene({
        previous: "机の上にノートパソコンとマグカップがある。",
        current: "机の上にノートパソコンとマグカップが置かれている。",
      }),
    ).toBe(true);
    expect(
      isSimilarScene({
        previous: "机の上にノートパソコンとマグカップがある。",
        current: "男性が猫を抱いて笑っている。",
      }),
    ).toBe(false);
    expect(isSimilarScene({ previous: "", current: "猫がいる。" })).toBe(false);
  });
});

describe("buildSceneMessages", () => {
  it("1 枚の画像と、説明か質問への答えを頼む文を目に渡す", () => {
    expect(buildSceneMessages({ frame: "data:image/jpeg;base64,AAA" })).toEqual([
      {
        role: "user",
        content: "この写真に写っているものを、日本語で 2 文以内で、具体的に説明して。",
        images: [
          { dataUrl: "data:image/jpeg;base64,AAA", name: "camera.jpg", mimeType: "image/jpeg" },
        ],
      },
    ]);
    expect(buildSceneMessages({ frame: "data:x", question: "何色？" })[0].content).toBe(
      "この写真について答えて: 何色？",
    );
  });
});

describe("hasFrameChanged", () => {
  it("座ったままの揺れ程度の差は変わっていないとし、大きく変わったら変わったとする", () => {
    const previous = new Uint8Array(192).fill(100);
    expect(hasFrameChanged({ previous, current: new Uint8Array(192).fill(104) })).toBe(false);
    expect(hasFrameChanged({ previous, current: new Uint8Array(192).fill(130) })).toBe(true);
  });

  it("比べる前の映像がなければ変わったとする", () => {
    expect(hasFrameChanged({ previous: null, current: new Uint8Array(192) })).toBe(true);
  });
});

describe("withScene", () => {
  it("相手の発言に、いまの様子を添える。様子がなければそのまま", () => {
    expect(withScene({ userText: "後ろに何がある？", caption: "棚がある。" })).toBe(
      "後ろに何がある？\n\n（いまカメラに映っているもの: 棚がある。映っている人はたぶん相手本人）",
    );
    expect(withScene({ userText: "やっほー", caption: "" })).toBe("やっほー");
  });
});

describe("buildSceneTurn", () => {
  it("見えた様子を、映っている人を相手本人として話しかけるよう渡し、記憶にはカメラで見たこととして残す", () => {
    expect(buildSceneTurn({ caption: "猫がいる。" })).toEqual({
      userText: expect.stringMatching(
        /^（いまカメラに映っているもの: 猫がいる。）\n[\s\S]*映っている人はたぶん相手本人/,
      ),
      historyText: "（カメラで見た: 猫がいる。）",
    });
  });
});
