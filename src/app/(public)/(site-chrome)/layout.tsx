import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { portfolioFontClassName } from "@/lib/theme/portfolio-fonts";

export default function SiteChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${portfolioFontClassName} flex min-h-0 flex-1 flex-col`}>
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
