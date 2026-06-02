import Link from "next/link";
import { SiteNav } from "@/components/layout/site-header/site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          utopi-a.dev
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
