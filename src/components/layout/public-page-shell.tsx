import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PublicPageShellProps = {
  children: ReactNode;
  className?: string;
  width?: "content" | "wide";
};

export function PublicPageShell({ children, className, width = "wide" }: PublicPageShellProps) {
  return (
    <div className={cn("relative flex flex-1 flex-col bg-background", className)}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -20%, var(--brand-glow), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:py-20",
          width === "wide" ? "max-w-6xl" : "max-w-3xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}
