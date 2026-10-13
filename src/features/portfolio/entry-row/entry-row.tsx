import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EntryRowProps = {
  title: string;
  description?: string;
  /** 右端に置く期間や状態などの短い補足 */
  meta?: ReactNode;
  href?: string;
};

/**
 * 一覧の 1 行。リンク時は行全体をクリック対象にし、ホバーで面を出す。
 * 左右に余白を取ったぶん負のマージンで打ち消し、文字の左端を見出しと揃える。
 */
export function EntryRow({ title, description, meta, href }: EntryRowProps) {
  const external = href?.startsWith("http") ?? false;

  const content: ReactNode = (
    <>
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-bold text-foreground">
          {title}
          {external ? (
            <ArrowUpRightIcon
              className="ml-1 inline size-3.5 -translate-y-px text-muted-foreground transition-[color,translate] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
              aria-hidden
            />
          ) : null}
        </span>
        {meta ? (
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{meta}</span>
        ) : null}
      </span>
      {description ? (
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </span>
      ) : null}
    </>
  );

  const rowClassName = "-mx-3 block rounded-lg px-3 py-3";
  const linkClassName = cn(
    rowClassName,
    "group transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
  );

  if (!href) {
    return <div className={rowClassName}>{content}</div>;
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className={linkClassName}>
      {content}
    </Link>
  );
}
