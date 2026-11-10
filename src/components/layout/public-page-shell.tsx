import type { ReactNode } from "react";

/** ヘッダー・フッターと左端をそろえ、作業用の画面は読みやすい幅に収める */
export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-container flex-1 pt-12 pb-20 sm:pt-16 sm:pb-24">
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}
