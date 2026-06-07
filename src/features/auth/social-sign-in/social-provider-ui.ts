import type { SocialBrandIconId } from "@/features/portfolio/social-icons/social-brand-icon";

export const socialProviderUi = [
  { id: "github", label: "GitHub", icon: "github" satisfies SocialBrandIconId },
  { id: "google", label: "Google" },
  { id: "discord", label: "Discord" },
  { id: "twitter", label: "X (Twitter)", icon: "x" satisfies SocialBrandIconId },
] as const;

export type SocialProviderId = (typeof socialProviderUi)[number]["id"];

export function listEnabledSocialProviderUi({ enabledIds }: { enabledIds: string[] }) {
  const enabled = new Set(enabledIds);
  return socialProviderUi.filter((item) => enabled.has(item.id));
}

export function listEnabledSocialProviderIds() {
  const ids: string[] = [];
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    ids.push("github");
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    ids.push("google");
  }
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    ids.push("discord");
  }
  if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
    ids.push("twitter");
  }
  return ids;
}
