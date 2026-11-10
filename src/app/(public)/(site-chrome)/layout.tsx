import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/cn";
import { siteFontVariables } from "@/lib/theme/site-fonts";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import "@/components/layout/site-chrome.css";

export default function SiteChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div
        className={cn(
          "site flex min-h-0 flex-1 flex-col selection:bg-primary/20",
          siteFontVariables,
        )}
      >
        <SiteHeader />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <SiteFooter />
      </div>
    </ThemeProvider>
  );
}
