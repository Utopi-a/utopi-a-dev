"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
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

function isNavActive({ pathname, href }: { pathname: string; href: string }) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

type SiteNavMobileSheetProps = {
  pathname: string;
};

export function SiteNavMobileSheet({ pathname }: SiteNavMobileSheetProps) {
  return (
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
              <Link
                href={item.href}
                prefetch={false}
                className={cn(
                  "block w-full rounded-lg px-4 py-3 text-base transition-colors",
                  isNavActive({ pathname, href: item.href })
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
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
  );
}
