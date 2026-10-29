import type { InferenceImageAttachment } from "@/features/local-llm/inference-worker/inference-worker-messages";

/**
 * 映像が変わったとみなす、縮小した画像の明るさの差（0〜1）。
 * Mac の内蔵カメラで、座ったままの人を映し続けると 0.01〜0.02 だった
 */
const FRAME_CHANGE_THRESHOLD = 0.05;

/**
 * 添えた画像がいまの相手のカメラだと伝える文。伝えないと、映っている人を他人として語ったり、
 * 前の話題から「店員さんかな」と仕事を決めつけたりした
 */
const CAMERA_NOTE =
  "（添えた画像は、いまの相手のカメラの映像。映っている人はたぶん相手本人なので「きみ」と呼び、映っていない仕事や肩書きは決めつけない）";

/** 見守りで映像が変わったときに、話しかけとして渡す文 */
const SCENE_REQUEST =
  "見えたものについて、気になったことや感想を一言、相手に話しかける。前に話したことの繰り返しは避ける。";

/**
 * 2 枚の縮小画像（明るさの並び）の平均の差で、カメラの前が変わったかを見る。
 * モデルに映像を説明させて比べると、同じ様子でも言い回しが毎回変わって見分けられなかった
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

/**
 * カメラを一緒に見ている間の 1 回の話しかけ。いまの映像を画像として添え、映像を見ながら話すモデル（LFM3-VL）に渡す。
 * text がなければ、見守りで映像が変わったときの話しかけにして、記憶には「カメラを見た」とだけ残す
 */
export function buildCameraTurn({ frame, text }: { frame: string; text?: string }) {
  const images: InferenceImageAttachment[] = [
    { dataUrl: frame, name: "camera.jpg", mimeType: "image/jpeg" },
  ];
  return {
    userText: `${text ?? SCENE_REQUEST}\n\n${CAMERA_NOTE}`,
    historyText: text ?? "（カメラを見た）",
    images,
  };
}
