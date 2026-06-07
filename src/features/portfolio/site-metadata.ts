import type { Metadata, Viewport } from "next";
import { siteProfile } from "@/features/portfolio/site-config";

export const siteMetadataConfig = {
  siteUrl: "https://utopi-a.dev",
  applicationName: "utopi-a.dev",
  title: {
    default: "utopi-a.dev | ゆーとぴあ",
    template: "%s | utopi-a.dev",
  },
  description: "ゆーとぴあのポートフォリオ — プロフィール、制作物、ブログ、実験的なミニアプリ",
  locale: "ja_JP",
  lang: "ja",
  themeColorLight: "#6B3560",
  themeColorDark: "#1E1A24",
  backgroundColor: "#FAF9FC",
  icons: {
    favicon: "/favicon.png",
    apple: "/icons/site-icon-180.png",
    icon32: "/icons/site-icon-32.png",
    icon192: "/icons/site-icon-192.png",
    icon512: "/icons/site-icon-512.png",
  },
  openGraphImage: {
    path: "/opengraph-image.jpg",
    width: 1200,
    height: 630,
    alt: "utopi-a.dev — ゆーとぴあのポートフォリオ",
    type: "image/jpeg",
  },
  creator: siteProfile.name,
  keywords: ["ポートフォリオ", "ブログ", "ゆーとぴあ", "utopi-a", "フルスタック"],
} as const;

export function buildRootMetadata(): Metadata {
  const { openGraphImage } = siteMetadataConfig;

  return {
    metadataBase: new URL(siteMetadataConfig.siteUrl),
    applicationName: siteMetadataConfig.applicationName,
    title: siteMetadataConfig.title,
    description: siteMetadataConfig.description,
    keywords: [...siteMetadataConfig.keywords],
    creator: siteMetadataConfig.creator,
    authors: [{ name: siteMetadataConfig.creator, url: siteMetadataConfig.siteUrl }],
    icons: {
      icon: [
        { url: siteMetadataConfig.icons.favicon, type: "image/png" },
        {
          url: siteMetadataConfig.icons.icon32,
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: siteMetadataConfig.icons.icon192,
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: siteMetadataConfig.icons.icon512,
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: siteMetadataConfig.icons.apple,
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      type: "website",
      locale: siteMetadataConfig.locale,
      url: siteMetadataConfig.siteUrl,
      siteName: siteMetadataConfig.applicationName,
      title: siteMetadataConfig.title.default,
      description: siteMetadataConfig.description,
      images: [
        {
          url: openGraphImage.path,
          width: openGraphImage.width,
          height: openGraphImage.height,
          alt: openGraphImage.alt,
          type: openGraphImage.type,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteMetadataConfig.title.default,
      description: siteMetadataConfig.description,
      images: [openGraphImage.path],
    },
    robots: {
      index: true,
      follow: true,
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteMetadataConfig.themeColorLight },
    { media: "(prefers-color-scheme: dark)", color: siteMetadataConfig.themeColorDark },
  ],
  colorScheme: "light dark",
};
