import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PublicPageShellProps = {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  centered?: boolean;
};

export function PublicPageShell({
  children,
  className,
  narrow = false,
  centered = false,
}: PublicPageShellProps) {
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col",
        "bg-[linear-gradient(180deg,var(--brand-gradient-from)_0%,var(--background)_38%,var(--background)_100%)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60 sm:h-64 sm:opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% -12%, var(--brand-glow), transparent 72%)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto w-full flex-1 px-4 py-10 sm:px-6 sm:py-14 md:py-16",
          narrow ? "max-w-3xl" : "max-w-5xl",
          centered && "flex flex-col items-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}
