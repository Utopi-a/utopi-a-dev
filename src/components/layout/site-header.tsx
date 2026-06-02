import Link from "next/link";

const publicNav = [
  { href: "/work", label: "Work" },
  { href: "/lab", label: "Lab" },
  { href: "/blog", label: "Blog" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-tight">
          utopi-a.dev
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          {publicNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
