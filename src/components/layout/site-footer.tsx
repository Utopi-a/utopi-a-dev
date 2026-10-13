import { siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="flex flex-col gap-4 border-t border-border py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          © {year} {siteProfile.name}
        </p>
        <SocialLinks />
      </div>
    </footer>
  );
}
