import { PublicPageShell } from "@/components/layout/public-page-shell";
import { WorksView } from "@/features/portfolio/works-view/works-view";

export default function WorkPage() {
  return (
    <PublicPageShell narrow>
      <WorksView />
    </PublicPageShell>
  );
}
