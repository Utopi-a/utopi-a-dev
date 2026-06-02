import { siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/50 bg-card/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 sm:flex-row sm:justify-between sm:px-6 sm:py-12">
        <p className="text-sm text-muted-foreground">
          © {year} {siteProfile.name}
        </p>
        <SocialLinks size="sm" />
      </div>
    </footer>
  );
}
