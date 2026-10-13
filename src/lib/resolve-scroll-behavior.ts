/** 動きを減らす設定のときは、なめらかなスクロールをやめて瞬時に移動する。 */
export function resolveScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
