/**
 * ページの表情ボタン。設定資料 00 の表情バリエーション 6 種に、モデルの表情（exp3 の Name）を対応させる。
 */
export const utopiaExpressions = [
  { id: "neutral", label: "通常", modelExpression: null },
  { id: "smile", label: "微笑み", modelExpression: "smile" },
  { id: "grin", label: "にっこり", modelExpression: "grin" },
  { id: "surprised", label: "驚き", modelExpression: "surprised" },
  { id: "shy", label: "照れ", modelExpression: "shy" },
  { id: "pout", label: "むすっ", modelExpression: "pout" },
] as const;
