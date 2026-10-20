import Link from "next/link";
import type { ReactNode } from "react";

type EntryRowProps = {
  title: string;
  description?: string;
  /** 行末に置く期間や状態などの短い補足 */
  meta?: ReactNode;
  href?: string;
};

export function EntryRow({ title, description, meta, href }: EntryRowProps) {
  const content: ReactNode = (
    <>
      <span className="pf-entry-head">
        <span className="pf-entry-title">{title}</span>
        {meta ? <span className="pf-entry-meta">{meta}</span> : null}
      </span>
      {description ? <span className="pf-entry-description">{description}</span> : null}
    </>
  );

  if (!href) {
    return <div className="pf-entry">{content}</div>;
  }

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="pf-entry">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className="pf-entry">
      {content}
    </Link>
  );
}
