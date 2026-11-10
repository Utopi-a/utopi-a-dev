import Link from "next/link";
import { SiteNav } from "@/components/layout/site-header/site-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container site-header-inner">
        <Link href="/" prefetch={false} className="site-brand">
          utopi-a.dev
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
