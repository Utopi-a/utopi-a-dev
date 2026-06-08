"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { publicNavItems } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

function NavLink({
  href,
  label,
  onClick,
  stacked = false,
}: {
  href: string;
  label: string;
  onClick?: () => void;
  stacked?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "rounded-lg text-sm transition-colors",
        stacked ? "block w-full px-4 py-3 text-base" : "px-3 py-1.5",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  return (
    <>
      <nav className="hidden items-center gap-0.5 md:flex" aria-label="メイン">
        {publicNavItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
        <ThemeToggle />
      </nav>

      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon" aria-label="メニューを開く">
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[min(100%,20rem)] flex-col gap-0 p-0 sm:max-w-xs"
        >
          <SheetHeader className="shrink-0 space-y-0 border-b border-border/50 px-6 pt-6 pb-5">
            <SheetTitle className="text-left">メニュー</SheetTitle>
            <SheetDescription className="sr-only">サイト内のページへ移動</SheetDescription>
          </SheetHeader>

          <nav className="flex flex-1 flex-col gap-1.5 px-6 py-5" aria-label="モバイル">
            {publicNavItems.map((item) => (
              <SheetClose key={item.href} asChild>
                <NavLink href={item.href} label={item.label} stacked />
              </SheetClose>
            ))}
          </nav>

          <SheetFooter className="mt-auto shrink-0 border-t border-border/50 p-0">
            <div className="flex w-full items-center justify-between gap-4 px-6 py-6">
              <SocialLinks size="sm" />
              <ThemeToggle />
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
