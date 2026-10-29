/**
 * LFM3 の思考（`<think>…</think>`）と、その後の発言を分ける。思考は読み上げず、道具の呼び出しも拾わない
 * （思考の中で「search を呼ぼう」と書いた例を、呼び出しと取り違えないため）。
 * 閉じタグがないまま終わったときは、考えている途中で上限に達したので、発言はないものとする。
 * 思考を頼んだときはテンプレートが `<think>` を書いてから生成を始めるので、出力には閉じタグしか現れない
 */
export function splitThinking({
  output,
  isThinkingRequested = false,
}: {
  output: string;
  isThinkingRequested?: boolean;
}) {
  const close = output.lastIndexOf("</think>");
  if (close >= 0) {
    return {
      thinking: output.slice(0, close).replace("<think>", "").trim(),
      visible: output.slice(close + "</think>".length).trim(),
      isComplete: true,
    };
  }
  if (output.includes("<think>") || isThinkingRequested) {
    return { thinking: output.replace("<think>", "").trim(), visible: "", isComplete: false };
  }
  return { thinking: "", visible: output.trim(), isComplete: true };
}
