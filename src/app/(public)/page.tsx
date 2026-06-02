import { PublicPageShell } from "@/components/layout/public-page-shell";
import { ProfileHero } from "@/features/portfolio/profile-hero/profile-hero";

export default function HomePage() {
  return (
    <PublicPageShell narrow centered>
      <ProfileHero variant="home" />
    </PublicPageShell>
  );
}
