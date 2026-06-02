import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/about", label: "About", variant: "default" as const },
  { href: "/blog", label: "Blog", variant: "outline" as const },
  { href: "/work", label: "Works", variant: "secondary" as const },
];

const socialLinks = [{ href: "https://github.com/Utopi-a", label: "GitHub" }] as const;

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-4 fill-current", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>GitHub</title>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section className="flex flex-col items-center gap-8 text-center sm:gap-10">
      <div
        className="relative size-28 overflow-hidden rounded-full border-4 border-card shadow-xl sm:size-32"
        style={{ boxShadow: "0 12px 40px var(--brand-glow)" }}
      >
        <div className="flex size-full items-center justify-center bg-muted text-4xl sm:text-5xl">
          🌸
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ゆーとぴあ</h1>
        <p className="text-lg text-muted-foreground sm:text-xl">1日24時間睡眠</p>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-3">
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(buttonVariants({ variant: item.variant, size: "sm" }))}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {socialLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/80 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label={label}
          >
            <GitHubIcon />
          </Link>
        ))}
      </div>
    </section>
  );
}
