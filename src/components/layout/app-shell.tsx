import Link from "next/link";

const appNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/diary", label: "Diary" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            App
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            {appNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link href="/" className="hover:text-foreground">
              Public site
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
