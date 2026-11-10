import { Manrope, Shippori_Mincho_B1 } from "next/font/google";

/**
 * 名前・ページ見出し・節見出し・一覧の項目名に使う和文の Web フォント。600 の 1 ウェイトだけ読む。
 * Google の和文フォントは unicode-range で 120 前後の片に分かれ、ページで使う字の片だけが落ちる。
 * 日本語の片は preload できないので preload: false にする（サブセットなしで preload すると next/font がエラーにする）
 */
export const siteDisplayFont = Shippori_Mincho_B1({
  variable: "--font-site-display",
  weight: "600",
  display: "swap",
  preload: false,
});

/**
 * 本文の欧文と数字。和文の本文は端末内蔵のゴシックに任せ、欧文だけ OS に依らずそろえる。
 * latin の可変フォント 1 本なので preload する。en dash がハイフンより十分長く、期間の「2015 – 2021」が読み分けられる
 */
export const siteLatinFont = Manrope({
  variable: "--font-site-latin",
  subsets: ["latin"],
  display: "swap",
});

/** `.site` を付ける要素（レイアウトと、body 直下へポータルされるメニューのシート）に一緒に付ける */
export const siteFontVariables = [siteDisplayFont.variable, siteLatinFont.variable].join(" ");
