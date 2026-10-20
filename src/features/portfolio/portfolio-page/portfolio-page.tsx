import type { ReactNode } from "react";
import "./portfolio.css";

export function PortfolioPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      <div className="pf-page">{children}</div>
    </div>
  );
}
