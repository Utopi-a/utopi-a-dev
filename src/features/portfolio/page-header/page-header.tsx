import Link from "next/link";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** 下層ページで、戻り先として親ページへのリンクを出す */
  parent?: { href: string; label: string };
  className?: string;
};

export function PageHeader({ title, description, parent, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {parent ? (
        <Link
          href={parent.href}
          className="inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {parent.label}
        </Link>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-wide text-balance">{title}</h1>
      {description ? (
        <p className="max-w-[36em] leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
    </header>
  );
}
