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

/** 見えた様子を、頭（ゆーとぴあちゃん）に話しかけとして渡す形にする */
export function buildSceneTurn({ caption }: { caption: string }) {
  return {
    userText: [
      `（いまカメラに映っているもの: ${caption}）`,
      "見えたものについて、気になったことや感想を一言話して。前に話したことの繰り返しは避ける。",
    ].join("\n"),
    historyText: `（カメラで見た: ${caption}）`,
  };
}
