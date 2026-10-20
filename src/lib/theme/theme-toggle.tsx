"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      disabled={!mounted}
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "size-8 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
        className,
      )}
    >
      {isDark ? "昼" : "夜"}
    </button>
  );
}
