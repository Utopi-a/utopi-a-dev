"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

  const buttonClassName = cn("text-muted-foreground hover:text-foreground", className);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="テーマを切り替える"
        disabled
        className={buttonClassName}
      >
        <SunIcon className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={buttonClassName}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
