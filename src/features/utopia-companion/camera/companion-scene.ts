import type { InferenceMessage } from "@/features/local-llm/inference-worker/inference-worker-messages";

/** 目（LFM3-VL）に、映っているものを説明させる指示 */
const DESCRIBE_SCENE = "この写真に写っているものを、日本語で 2 文以内で、具体的に説明して。";

/** 目に渡す 1 回分のやり取り。question があれば、それに答えさせる */
export function buildSceneMessages({
  frame,
  question,
}: {
  frame: string;
  question?: string;
}): InferenceMessage[] {
  return [
    {
      role: "user",
      content: question ? `この写真について答えて: ${question}` : DESCRIBE_SCENE,
      images: [{ dataUrl: frame, name: "camera.jpg", mimeType: "image/jpeg" }],
    },
  ];
}

/**
 * 映像が変わったとみなす、縮小した画像の明るさの差（0〜1）。
 * Mac の内蔵カメラで、座ったままの人を映し続けると 0.01〜0.02 だった
 */
const FRAME_CHANGE_THRESHOLD = 0.05;

/**
 * 2 枚の縮小画像（明るさの並び）の平均の差で、カメラの前が変わったかを見る。
 * 目の説明は同じ様子でも毎回言い回しが変わり、文の比較では見分けられなかった
 */
export function hasFrameChanged({
  previous,
  current,
}: {
  previous: Uint8Array | null;
  current: Uint8Array;
}) {
  if (!previous || previous.length !== current.length) {
    return true;
  }
  let total = 0;
  for (let index = 0; index < current.length; index += 1) {
    total += Math.abs(previous[index] - current[index]);
  }
  return total / current.length / 255 >= FRAME_CHANGE_THRESHOLD;
}

function bigrams({ text }: { text: string }) {
  const characters = [...text.replace(/[\s、。,.]/g, "")];
  return new Set(characters.slice(1).map((character, index) => characters[index] + character));
}

/**
 * 2 つの説明が同じ様子を言っているか（文字の 2 つ組の重なり）。カメラの前が変わらないのに
 * 同じ感想を言い続けないよう、変わったときだけ話すのに使う
 */
export function isSimilarScene({ previous, current }: { previous: string; current: string }) {
  const a = bigrams({ text: previous });
  const b = bigrams({ text: current });
  if (a.size === 0 || b.size === 0) {
    return false;
  }
  const shared = [...a].filter((pair) => b.has(pair)).length;
  return shared / (a.size + b.size - shared) >= 0.5;
}

/**
 * 見えた様子を、頭（ゆーとぴあちゃん）に話しかけとして渡す形にする。
 * 目は人を「男性が写っている」と他人のように書くので、そのまま渡すと話し相手を第三者として語り、
 * 前の話題から「店員さんかな」と決めつけた。映っている人は相手本人として話しかけさせる
 */
export function buildSceneTurn({ caption }: { caption: string }) {
  return {
    userText: [
      `（いまカメラに映っているもの: ${caption}）`,
      "これは話し相手のカメラの映像で、映っている人はたぶん相手本人。人には「きみ」と話しかけ、映っていない仕事や肩書きは決めつけない。",
      "見えたものについて、気になったことや感想を一言、相手に話しかける。前に話したことの繰り返しは避ける。",
    ].join("\n"),
    historyText: `（カメラで見た: ${caption}）`,
  };
}
