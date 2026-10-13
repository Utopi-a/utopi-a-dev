/** 動きを減らす設定のときは、なめらかなスクロールをやめて瞬時に移動する。 */
export function resolveScrollBehavior(): ScrollBehavior {
  // matchMedia がない環境（古いブラウザやテスト）では、これまでどおりなめらかに移動する。
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
