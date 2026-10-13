import { LINE_Seed_JP } from "next/font/google";

export const lineSeedJp = LINE_Seed_JP({
  variable: "--font-line-seed-jp",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
});

export const portfolioFontClassName = [lineSeedJp.variable, "font-sans"].join(" ");
