import type { SocialBrandIconId } from "@/features/portfolio/social-icons/social-brand-icon";

export const siteProfile = {
  name: "ゆーとぴあ",
  avatarSrc: "/p0zKKXuf_400x400.jpg",
  avatarAlt: "ゆーとぴあのプロフィール画像",
} as const;

export const publicNavItems = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/work", label: "Works" },
  { href: "/lab", label: "Lab" },
] as const;

export const socialLinks: ReadonlyArray<{
  href: string;
  label: string;
  icon: SocialBrandIconId;
}> = [
  {
    href: "https://twitter.com/ITF_biol21",
    label: "X (Twitter)",
    icon: "x",
  },
  {
    href: "https://github.com/Utopi-a",
    label: "GitHub",
    icon: "github",
  },
];

export const exploreLinks = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/work", label: "Works" },
  { href: "/lab", label: "Lab" },
] as const;
