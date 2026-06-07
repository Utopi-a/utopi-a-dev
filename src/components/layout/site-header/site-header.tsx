import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/layout/site-header/site-nav";
import { siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 transition-colors hover:text-primary"
        >
          <span className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-border/70 shadow-sm sm:size-9">
            <Image
              src={siteProfile.avatarSrc}
              alt=""
              width={36}
              height={36}
              className="size-full object-cover"
            />
          </span>
          <span className="truncate font-semibold tracking-tight">utopi-a.dev</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <SiteNav />
          <ThemeToggle />
          <div className="hidden sm:block">
            <SocialLinks size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
