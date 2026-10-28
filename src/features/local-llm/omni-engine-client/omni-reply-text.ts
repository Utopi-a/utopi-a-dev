import type { LocalLlmReplyMode } from "@/features/local-llm/inference-worker/inference-worker-messages";

/** モデルカードが各モードに指定している system 文 */
export function systemTextFor({ replyMode }: { replyMode: LocalLlmReplyMode }) {
  switch (replyMode.mode) {
    case "transcribe":
      return `Perform ASR in ${replyMode.language}.`;
    case "text":
      return "";
  }
}

/**
 * エンジンが送る「ここまでの返答全体」から、チャット画面に足す差分を返す。
 * 途中経過の末尾は、トークンの境目で切れたマルチバイト文字が U+FFFD になっているので、確定するまで送らない。
 * 前回までの返答に続かない場合は null（足すと二重になる）。
 */
export function nextReplyDelta({ previous, current }: { previous: string; current: string }) {
  const settled = current.replace(/�+$/, "");
  if (!settled.startsWith(previous)) {
    return null;
  }
  return { settled, delta: settled.slice(previous.length) };
}
