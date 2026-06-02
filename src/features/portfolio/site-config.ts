export const siteProfile = {
  name: "ゆーとぴあ",
  homeTagline: "1日24時間睡眠",
  avatarSrc: "/p0zKKXuf_400x400.jpg",
  avatarAlt: "ゆーとぴあのプロフィール画像",
} as const;

export const publicNavItems = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/work", label: "Works" },
] as const;

export const contactLink = {
  href: "https://twitter.com/ITF_biol21",
  label: "Contact",
} as const;

export const socialLinks = [
  {
    href: "https://twitter.com/ITF_biol21",
    label: "X (Twitter)",
    iconSrc: "/XIcon.png",
  },
  {
    href: "https://github.com/Utopi-a",
    label: "GitHub",
    iconSrc: "/mark-github.svg",
  },
] as const;
