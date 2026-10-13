import type { ReactNode } from "react";

type LabeledSectionProps = {
  title: string;
  /** 見出しの横（デスクトップでは下）に置く補助リンク */
  action?: ReactNode;
  children: ReactNode;
};

/** デスクトップでは見出しを左の列に置き、本文の左端をページ全体で揃える */
export function LabeledSection({ title, action, children }: LabeledSectionProps) {
  return (
    <section className="grid gap-x-10 gap-y-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <div className="flex items-baseline justify-between gap-4 sm:flex-col sm:justify-start sm:gap-2">
        <h2 className="text-sm text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
