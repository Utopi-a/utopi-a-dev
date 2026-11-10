import type { ReactNode } from "react";
import "./portfolio.css";

export function PortfolioPage({ children }: { children: ReactNode }) {
  return <div className="site-container pf-page flex-1">{children}</div>;
}
