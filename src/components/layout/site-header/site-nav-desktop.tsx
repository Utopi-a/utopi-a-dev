import Link from "next/link";
import { publicNavItems } from "@/features/portfolio/site-config";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

function isNavActive({ pathname, href }: { pathname: string; href: string }) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

type SiteNavDesktopProps = {
  pathname: string;
};

export function SiteNavDesktop({ pathname }: SiteNavDesktopProps) {
  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label="メイン">
      {publicNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            isNavActive({ pathname, href: item.href })
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
      <ThemeToggle />
    </nav>
  );
}
