import { siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-container">
      <div className="site-footer-inner">
        <p className="tabular-nums">
          © {year} {siteProfile.name}
        </p>
        <SocialLinks />
      </div>
    </footer>
  );
}
