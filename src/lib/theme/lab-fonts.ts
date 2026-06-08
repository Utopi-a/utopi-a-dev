import { Geist_Mono } from "next/font/google";
import { zenKakuGothicNew } from "@/lib/theme/zen-kaku-font";

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const labFontClassName = [zenKakuGothicNew.variable, geistMono.variable].join(" ");
