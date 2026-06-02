import { HomeHero } from "@/components/layout/home-hero";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export default function HomePage() {
  return (
    <PublicPageShell narrow>
      <HomeHero />
    </PublicPageShell>
  );
}
