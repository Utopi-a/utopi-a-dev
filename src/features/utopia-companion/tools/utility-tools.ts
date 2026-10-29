import { defineTool } from "@/features/utopia-companion/companion-tool";

const TIME_WORDS =
  /何時|なんじ|時間|時刻|今日|きょう|明日|あした|昨日|きのう|曜日|日付|何日|なんにち|今年|今月/;
const ARITHMETIC = /[0-9０-９].*[+\-*/×÷＋－％%^]|計算|足す|引く|掛け|割る/;

/**
 * 四則演算と累乗・剰余・括弧だけを読む計算機。式を JavaScript として評価しない（eval は任意のコードを
 * 実行できるため）。数は小数まで
 */
export function calculateExpression({ expression }: { expression: string }) {
  const source = expression
    .normalize("NFKC")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    // 全角のマイナス（U+2212）やダッシュは NFKC でも ASCII のマイナスにならない
    .replace(/[−‐–—]/g, "-")
    .replace(/[,\s]/g, "");
  let position = 0;

  function peek() {
    return source[position];
  }
  function parseNumber() {
    const match = source.slice(position).match(/^\d+(\.\d+)?/);
    if (!match) {
      throw new Error(`${position + 1} 文字目が読めない`);
    }
    position += match[0].length;
    return Number(match[0]);
  }
  function parsePrimary(): number {
    if (peek() === "(") {
      position += 1;
      const value = parseSum();
      if (peek() !== ")") {
        throw new Error("括弧が閉じていない");
      }
      position += 1;
      return value;
    }
    if (peek() === "-") {
      position += 1;
      return -parsePrimary();
    }
    return parseNumber();
  }
  function parsePower(): number {
    const base = parsePrimary();
    if (peek() === "^") {
      position += 1;
      return base ** parsePower();
    }
    return base;
  }
  function parseProduct(): number {
    let value = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const operator = source[position];
      position += 1;
      const right = parsePower();
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  }
  function parseSum(): number {
    let value = parseProduct();
    while (peek() === "+" || peek() === "-") {
      const operator = source[position];
      position += 1;
      const right = parseProduct();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const value = parseSum();
  if (position < source.length) {
    throw new Error(`${position + 1} 文字目が読めない`);
  }
  if (!Number.isFinite(value)) {
    throw new Error("答えが数にならない（0 で割った など）");
  }
  return Number(value.toPrecision(12));
}

export const UTILITY_TOOLS = [
  defineTool({
    name: "get_current_time",
    description: "いまの日時（年月日・曜日・時刻）を返す。時間や日付、曜日の話に使う。",
    parameters: {},
    describe: () => "時計を見てる…",
    run: async (_args, { now }) =>
      now.toLocaleString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
      }),
    isRelevant: (userText) => TIME_WORDS.test(userText),
  }),
  defineTool({
    name: "calculate",
    description: "数式を計算する（+ - * / ^ % と括弧）。暗算せずに、数の計算はこれを使う。",
    parameters: { expression: "計算する式（例: (1200+800)*1.1）" },
    describe: () => "計算してる…",
    run: async ({ expression }) => `${expression} = ${calculateExpression({ expression })}`,
    isRelevant: (userText) => ARITHMETIC.test(userText),
  }),
];
