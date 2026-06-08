import { PublicPageShell } from "@/components/layout/public-page-shell";
import { LabView } from "@/features/portfolio/lab-view/lab-view";

export default function LabPage() {
  return (
    <PublicPageShell width="wide">
      <LabView />
    </PublicPageShell>
  );
}
