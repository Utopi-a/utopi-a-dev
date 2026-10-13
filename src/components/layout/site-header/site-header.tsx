import Link from "next/link";
import { SiteNav } from "@/components/layout/site-header/site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          prefetch={false}
          className="-ml-2 rounded-md px-2 py-1 text-sm font-bold tracking-tight transition-colors hover:text-primary"
        >
          utopi-a.dev
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
