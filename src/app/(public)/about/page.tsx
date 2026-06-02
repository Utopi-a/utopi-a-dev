import { PublicPageShell } from "@/components/layout/public-page-shell";
import { AboutView } from "@/features/portfolio/about-view/about-view";

export default function AboutPage() {
  return (
    <PublicPageShell narrow>
      <AboutView />
    </PublicPageShell>
  );
}
