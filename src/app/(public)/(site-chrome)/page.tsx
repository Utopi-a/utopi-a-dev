import { PublicPageShell } from "@/components/layout/public-page-shell";
import { HomeView } from "@/features/portfolio/home-view/home-view";

export default function HomePage() {
  return (
    <PublicPageShell width="wide">
      <HomeView />
    </PublicPageShell>
  );
}
