import type { Metadata } from "next";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import { UtopiaLive2DView } from "@/features/utopia-live2d/utopia-live2d-view";

export const metadata: Metadata = {
  title: "ゆーとぴあちゃん",
};

export default function UtopiaLabPage() {
  return (
    <PublicPageShell>
      <UtopiaLive2DView />
    </PublicPageShell>
  );
}
