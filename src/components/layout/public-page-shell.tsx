import type { ReactNode } from "react";

/** ヘッダー・フッターと同じ幅の 1 カラムに本文を収める */
export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      {children}
    </div>
  );
}
