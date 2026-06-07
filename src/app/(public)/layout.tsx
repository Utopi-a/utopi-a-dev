import { PublicChromeShell } from "@/components/layout/public-chrome-shell/public-chrome-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicChromeShell header={<SiteHeader />} footer={<SiteFooter />}>
        {children}
      </PublicChromeShell>
      <Toaster />
    </>
  );
}
