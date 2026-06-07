import type { Metadata } from "next";
import { fontVariableClassName } from "@/lib/theme/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://utopi-a.dev"),
  title: {
    default: "utopi-a.dev | ゆーとぴあ",
    template: "%s | utopi-a.dev",
  },
  description: "ゆーとぴあのポートフォリオ — プロフィール、制作物、ブログ",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "utopi-a.dev",
    title: "utopi-a.dev | ゆーとぴあ",
    description: "ゆーとぴあのポートフォリオ — プロフィール、制作物、ブログ",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "utopi-a.dev",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "utopi-a.dev | ゆーとぴあ",
    description: "ゆーとぴあのポートフォリオ — プロフィール、制作物、ブログ",
    images: ["/opengraph-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${fontVariableClassName} h-full antialiased`}>
      <body suppressHydrationWarning className="flex min-h-dvh flex-col bg-background">
        {children}
      </body>
    </html>
  );
}
