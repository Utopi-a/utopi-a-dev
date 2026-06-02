import { DM_Sans, Geist_Mono, Zen_Kaku_Gothic_New } from "next/font/google";

/** 日本語（ひらがな・漢字・全角） */
export const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

/** 英語・ラテン文字 */
export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** コード・等幅 */
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const fontVariableClassName = [
  zenKakuGothicNew.variable,
  dmSans.variable,
  geistMono.variable,
].join(" ");
