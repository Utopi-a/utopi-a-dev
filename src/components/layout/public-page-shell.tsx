import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PublicPageShell({
  children,
  className,
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col",
        "bg-[linear-gradient(180deg,var(--brand-gradient-from)_0%,var(--background)_42%,var(--background)_100%)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, var(--brand-glow), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto w-full flex-1 px-6 py-12 sm:py-16",
          narrow ? "max-w-3xl" : "max-w-5xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}
