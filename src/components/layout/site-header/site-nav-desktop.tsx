import Link from "next/link";
import { isNavActive } from "@/components/layout/site-header/is-nav-active";
import { publicNavItems } from "@/features/portfolio/site-config";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

type SiteNavDesktopProps = {
  pathname: string;
};

export function SiteNavDesktop({ pathname }: SiteNavDesktopProps) {
  return (
    <nav className="hidden items-center gap-2 md:flex" aria-label="メイン">
      {publicNavItems.map((item) => {
        const active = isNavActive({ pathname, href: item.href });

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className="site-nav-link"
          >
            {item.label}
          </Link>
        );
      })}
      <ThemeToggle className="ml-2" />
    </nav>
  );
}
