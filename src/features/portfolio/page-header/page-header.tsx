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
        <Link href={parent.href} className="site-back-link inline-block">
          {parent.label}
        </Link>
      ) : null}
      <h1 className="site-title">{title}</h1>
      {description ? <p className="site-lead">{description}</p> : null}
    </header>
  );
}
