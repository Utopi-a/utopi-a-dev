import Link from "next/link";
import { cn } from "@/lib/cn";

const publicNav = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/work", label: "Works" },
  { href: "/lab", label: "Lab" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          utopi-a.dev
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors",
                "hover:bg-accent/60 hover:text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
