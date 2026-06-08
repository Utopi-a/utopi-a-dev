import { DM_Sans } from "next/font/google";
import { zenKakuGothicNew } from "@/lib/theme/zen-kaku-font";

export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const portfolioFontClassName = [
  zenKakuGothicNew.variable,
  dmSans.variable,
  "font-sans",
].join(" ");
